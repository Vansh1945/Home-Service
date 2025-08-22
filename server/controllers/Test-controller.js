const Question = require('../models/AddQuestion-model');
const ProviderTest = require('../models/Test-model');
const Provider = require('../models/Provider-model');
const { ObjectId } = require('mongoose').Types;

// Test configuration
const TEST_CONFIG = {
    TIME_LIMIT: 10 * 60 * 1000, // 10 minutes in milliseconds
    PASSING_SCORE: 70,
    QUESTIONS_PER_TEST: 10,
    MAX_ATTEMPTS: 3 // Maximum attempts allowed per category
};

// Helper function to calculate performance rating
function getPerformanceRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
}

// ===================== PROVIDER TEST FUNCTIONS ===================== //

/**
 * Get available test categories - Provider
 */
const getTestCategories = async (req, res) => {
    try {
        const provider = req.provider;
        
        // Get all categories and subcategories
        const categories = await Question.distinct('category');
        const subcategories = await Question.distinct('subcategory');

        // Get passed tests to determine which categories are locked
        const passedTests = await ProviderTest.find({
            provider: provider._id,
            passed: true
        }).select('testCategory');

        // Get attempt counts for each category
        const attemptCounts = await ProviderTest.aggregate([
            { $match: { provider: provider._id } },
            { $group: { 
                _id: "$testCategory", 
                attempts: { $sum: 1 },
                passed: { $max: { $cond: ["$passed", 1, 0] } }
            }},
            { $project: {
                category: "$_id",
                attempts: 1,
                passed: { $cond: ["$passed", true, false] },
                attemptsLeft: { $subtract: [TEST_CONFIG.MAX_ATTEMPTS, "$attempts"] }
            }}
        ]);

        const lockedCategories = passedTests.map(test => test.testCategory);

        res.json({
            success: true,
            data: {
                categories,
                subcategories,
                lockedCategories: [...new Set(lockedCategories)], // Remove duplicates
                attemptCounts
            }
        });
    } catch (error) {
        console.error('Error getting test categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test categories'
        });
    }
};

/**
 * Start a new test with selected category - Provider
 */
const startTest = async (req, res) => {
    try {
        const provider = req.provider;
        const { category, subcategory } = req.body;

        // Validate input
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }

        // Check if provider has already passed this category
        const alreadyPassed = await ProviderTest.findOne({
            provider: provider._id,
            testCategory: category,
            passed: true
        });

        if (alreadyPassed) {
            return res.status(400).json({
                success: false,
                message: 'You have already passed this category test'
            });
        }

        // Check attempt count for this category
        const attemptCount = await ProviderTest.countDocuments({
            provider: provider._id,
            testCategory: category
        });

        if (attemptCount >= TEST_CONFIG.MAX_ATTEMPTS) {
            return res.status(400).json({
                success: false,
                message: `You have reached the maximum of ${TEST_CONFIG.MAX_ATTEMPTS} attempts for this category`
            });
        }

        // Check for existing active test
        const activeTest = await ProviderTest.findOne({
            provider: provider._id,
            status: 'in-progress'
        });

        if (activeTest) {
            // Check if test has expired
            const timeElapsed = new Date() - activeTest.startedAt;
            if (timeElapsed > TEST_CONFIG.TIME_LIMIT) {
                // Mark expired test as failed
                activeTest.status = 'completed';
                activeTest.passed = false;
                activeTest.completedAt = new Date();
                activeTest.timeTaken = TEST_CONFIG.TIME_LIMIT;
                await activeTest.save();
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active test',
                    testId: activeTest._id,
                    timeRemaining: TEST_CONFIG.TIME_LIMIT - timeElapsed
                });
            }
        }

        // Build question query
        const query = {
            isActive: true,
            category: category,
            ...(subcategory && { subcategory })
        };

        // Get random questions
        const questions = await Question.aggregate([
            { $match: query },
            { $sample: { size: TEST_CONFIG.QUESTIONS_PER_TEST } }
        ]);

        if (questions.length < TEST_CONFIG.QUESTIONS_PER_TEST) {
            return res.status(400).json({
                success: false,
                message: 'Not enough questions available for selected criteria'
            });
        }

        // Create new test with proper question structure
        const test = new ProviderTest({
            provider: provider._id,
            questions: questions.map(q => ({
                questionId: q._id,
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                selectedOption: null,
                isCorrect: false,
                status: 'unanswered'
            })),
            status: 'in-progress',
            testCategory: category,
            testSubcategory: subcategory || 'all',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + TEST_CONFIG.TIME_LIMIT),
            attemptNumber: attemptCount + 1
        });

        await test.save();

        res.status(201).json({
            success: true,
            message: 'Test started successfully',
            testId: test._id,
            totalQuestions: test.questions.length,
            testCategory: test.testCategory,
            testSubcategory: test.testSubcategory,
            startedAt: test.startedAt,
            expiresAt: test.expiresAt,
            timeLimit: TEST_CONFIG.TIME_LIMIT,
            attemptNumber: test.attemptNumber,
            attemptsRemaining: TEST_CONFIG.MAX_ATTEMPTS - test.attemptNumber
        });
    } catch (error) {
        console.error('Error starting test:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start test'
        });
    }
};

/**
 * Submit test answers - Provider
 */
const submitTest = async (req, res) => {
    try {
        const { testId, answers } = req.body;
        const provider = req.provider;

        // Validate input
        if (!testId || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Test ID and answers are required'
            });
        }

        // Find and validate test
        const test = await ProviderTest.findOne({
            _id: testId,
            provider: provider._id,
            status: 'in-progress'
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found or already submitted'
            });
        }

        // Check if test has expired
        const now = new Date();
        if (now > test.expiresAt) {
            test.status = 'completed';
            test.passed = false;
            test.completedAt = now;
            test.timeTaken = TEST_CONFIG.TIME_LIMIT;
            await test.save();
            
            return res.status(400).json({
                success: false,
                message: 'Test time has expired',
                results: {
                    testId: test._id,
                    score: 0,
                    passed: false,
                    correctAnswers: 0,
                    totalQuestions: test.questions.length,
                    timeTaken: TEST_CONFIG.TIME_LIMIT,
                    completedAt: now,
                    attemptsRemaining: TEST_CONFIG.MAX_ATTEMPTS - test.attemptNumber
                }
            });
        }

        // Process answers
        let answeredCount = 0;
        let correctCount = 0;

        test.questions.forEach(question => {
            const answer = answers.find(a =>
                a.questionId && question.questionId &&
                a.questionId.toString() === question.questionId.toString()
            );

            if (answer) {
                question.selectedOption = answer.selectedOption;
                question.isCorrect = answer.selectedOption === question.correctAnswer;
                question.status = 'answered';
                answeredCount++;

                if (question.isCorrect) {
                    correctCount++;
                }
            }
        });

        // Calculate score
        const score = Math.round((correctCount / test.questions.length) * 100) || 0;
        const passed = score >= TEST_CONFIG.PASSING_SCORE;

        // Update test results
        test.score = score;
        test.passed = passed;
        test.status = 'completed';
        test.completedAt = now;
        test.timeTaken = Math.floor((test.completedAt - test.startedAt) / 1000);
        test.questionsAnswered = answeredCount;

        await test.save();

        // Update provider status if passed
        if (passed) {
            await Provider.findByIdAndUpdate(
                provider._id,
                {
                    $addToSet: { passedTestCategories: test.testCategory },
                    testScore: score,
                    testCompletionDate: new Date()
                },
                { new: true }
            );
        }

        res.json({
            success: true,
            message: 'Test submitted successfully',
            results: {
                testId: test._id,
                score,
                passed,
                correctAnswers: correctCount,
                totalQuestions: test.questions.length,
                timeTaken: test.timeTaken,
                testCategory: test.testCategory,
                testSubcategory: test.testSubcategory,
                completedAt: test.completedAt,
                performance: getPerformanceRating(score),
                attemptNumber: test.attemptNumber,
                attemptsRemaining: passed ? 0 : TEST_CONFIG.MAX_ATTEMPTS - test.attemptNumber
            }
        });
    } catch (error) {
        console.error('Error submitting test:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit test'
        });
    }
};

/**
 * Get test results history - Provider
 */
const getTestResults = async (req, res) => {
    try {
        const provider = req.provider;

        const results = await ProviderTest.find({ provider: provider._id })
            .sort({ completedAt: -1 })
            .select('testCategory testSubcategory score passed completedAt timeTaken questionsAnswered status attemptNumber')
            .lean();

        // Calculate attempts remaining for each category
        const attemptsData = await ProviderTest.aggregate([
            { $match: { provider: provider._id } },
            { $group: { 
                _id: "$testCategory", 
                attempts: { $sum: 1 },
                passed: { $max: { $cond: ["$passed", 1, 0] } }
            }},
            { $project: {
                category: "$_id",
                attempts: 1,
                passed: { $cond: ["$passed", true, false] },
                attemptsLeft: { $subtract: [TEST_CONFIG.MAX_ATTEMPTS, "$attempts"] }
            }}
        ]);

        const formattedResults = results.map(test => {
            const categoryData = attemptsData.find(d => d.category === test.testCategory) || {};
            return {
                testId: test._id,
                category: test.testCategory,
                subcategory: test.testSubcategory,
                score: test.score,
                passed: test.passed,
                status: test.status,
                date: test.completedAt,
                timeTaken: test.timeTaken,
                questionsAnswered: test.questionsAnswered,
                performance: getPerformanceRating(test.score),
                attemptNumber: test.attemptNumber,
                attemptsRemaining: test.passed ? 0 : categoryData.attemptsLeft || 0
            };
        });

        res.json({
            success: true,
            data: formattedResults
        });
    } catch (error) {
        console.error('Error getting test results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test results'
        });
    }
};

/**
 * Get specific test details - Provider
 */
const getTestDetails = async (req, res) => {
    try {
        const { testId } = req.params;
        const provider = req.provider;

        if (!ObjectId.isValid(testId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid test ID'
            });
        }

        const test = await ProviderTest.findOne({
            _id: testId,
            provider: provider._id
        }).lean();

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        // Get attempts data for this category
        const attemptsData = await ProviderTest.aggregate([
            { $match: { 
                provider: provider._id,
                testCategory: test.testCategory 
            }},
            { $group: { 
                _id: null,
                attempts: { $sum: 1 },
                passed: { $max: { $cond: ["$passed", 1, 0] } }
            }},
            { $project: {
                attempts: 1,
                passed: { $cond: ["$passed", true, false] },
                attemptsLeft: { $subtract: [TEST_CONFIG.MAX_ATTEMPTS, "$attempts"] }
            }}
        ]);

        const response = {
            testId: test._id,
            status: test.status,
            score: test.score,
            passed: test.passed,
            category: test.testCategory,
            subcategory: test.testSubcategory,
            startedAt: test.startedAt,
            completedAt: test.completedAt,
            expiresAt: test.expiresAt,
            timeTaken: test.timeTaken,
            questions: test.questions.map(q => ({
                questionId: q.questionId,
                questionText: q.questionText,
                options: q.options,
                selectedOption: q.selectedOption,
                correctAnswer: test.status === 'completed' ? q.correctAnswer : undefined,
                isCorrect: test.status === 'completed' ? q.isCorrect : undefined
            })),
            performance: getPerformanceRating(test.score),
            attemptNumber: test.attemptNumber,
            attemptsRemaining: test.passed ? 0 : attemptsData[0]?.attemptsLeft || 0
        };

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error getting test details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test details'
        });
    }
};

module.exports = {
    getTestCategories,
    startTest,
    submitTest,
    getTestResults,
    getTestDetails
};