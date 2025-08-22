const mongoose = require('mongoose');
const Question = require('../models/AddQuestion-model');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Add new question
const addQuestion = async (req, res) => {
  try {
    const { questionText, options, correctAnswer, category, subcategory } = req.body;

    const newQuestion = new Question({
      questionText,
      options,
      correctAnswer,
      category,
      subcategory,
      createdBy: req.admin._id
    });

    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      question: newQuestion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update question
const updateQuestion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { questionText, options, correctAnswer, category, subcategory, isActive } = req.body;
    const questionId = req.params.id;

    // पहले question को fetch करें
    const question = await Question.findById(questionId).session(session);
    
    if (!question) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // मैन्युअल validation
    if (options) {
      // Options की लंबाई चेक करें
      if (options.length < 2 || options.length > 5) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Questions must have between 2-5 options'
        });
      }

      // Correct answer validation
      if (correctAnswer !== undefined) {
        if (correctAnswer < 0 || correctAnswer >= options.length) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Correct answer must be between 0 and ${options.length - 1}`
          });
        }
        question.correctAnswer = correctAnswer;
      }
      question.options = options;
    }

    // अन्य fields को अपडेट करें
    if (questionText !== undefined) question.questionText = questionText;
    if (category !== undefined) question.category = category;
    if (subcategory !== undefined) question.subcategory = subcategory;
    if (isActive !== undefined) question.isActive = isActive;

    // स्कीमा validators को मैन्युअली ट्रिगर करें
    await question.validate();

    // सेव करें
    await question.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    await session.abortTransaction();
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: `Validation error: ${messages.join(', ')}`
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all questions
const getAllQuestions = async (req, res) => {
  try {
    const { category, subcategory, isActive } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (isActive) filter.isActive = isActive;

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get single question
const getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add bulk questions
const addBulkQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    // Add createdBy to each question
    const questionsToAdd = questions.map(question => ({
      ...question,
      createdBy: req.admin._id
    }));

    const result = await Question.insertMany(questionsToAdd);

    res.status(201).json({
      success: true,
      message: `${result.length} questions added successfully`,
      count: result.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Download questions PDF
const downloadQuestionsPDF = async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const questions = await Question.find(filter)
      .sort({ category: 1, subcategory: 1 });

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `questions_${Date.now()}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Question Bank', { align: 'center' });
    doc.moveDown();

    let currentCategory = '';
    let currentSubcategory = '';

    questions.forEach((question, index) => {
      // Add category heading if changed
      if (question.category !== currentCategory) {
        currentCategory = question.category;
        doc.fontSize(16).text(currentCategory.toUpperCase(), { underline: true });
        doc.moveDown();
        currentSubcategory = ''; // Reset subcategory when category changes
      }

      // Add subcategory heading if changed
      if (question.subcategory !== currentSubcategory) {
        currentSubcategory = question.subcategory;
        doc.fontSize(14).text(currentSubcategory.charAt(0).toUpperCase() + currentSubcategory.slice(1));
        doc.moveDown();
      }

      // Add question
      doc.fontSize(12).text(`${index + 1}. ${question.questionText}`);
      
      // Add options
      question.options.forEach((option, i) => {
        doc.text(`   ${String.fromCharCode(97 + i)}. ${option}`);
      });

      // Add correct answer
      doc.text(`Correct Answer: ${String.fromCharCode(97 + question.correctAnswer)}`, { indent: 20 });
      
      doc.moveDown();
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};





module.exports = {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestion,
  addBulkQuestions,
  downloadQuestionsPDF,
};