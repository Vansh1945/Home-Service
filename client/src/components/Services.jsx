import React from 'react';
import { 
    FaBolt, 
    FaTools, 
    FaHome, 
    FaPlug, 
    FaLightbulb, 
    FaShieldAlt,
    FaSnowflake,
    FaClock
} from 'react-icons/fa';

const Services = () => {
    const services = [
        {
            id: 1,
            title: "House Wiring",
            description: "Complete residential wiring solutions with modern safety standards and premium materials for reliable electrical systems.",
            icon: <FaHome className="text-4xl" />,
        },
        {
            id: 2,
            title: "Electrical Repair",
            description: "Quick and efficient repair services for all electrical issues, from faulty outlets to circuit breaker problems.",
            icon: <FaTools className="text-4xl" />,
        },
        {
            id: 3,
            title: "Lighting Installation",
            description: "Professional lighting solutions including LED installations, custom designs, and energy-efficient options.",
            icon: <FaLightbulb className="text-4xl" />,
        },
        {
            id: 4,
            title: "AC Maintenance",
            description: "Comprehensive air conditioning maintenance and electrical services to keep your cooling systems running efficiently.",
            icon: <FaSnowflake className="text-4xl" />,
        },
        {
            id: 5,
            title: "Safety Inspections",
            description: "Thorough electrical safety audits and inspections to identify potential hazards and ensure code compliance.",
            icon: <FaShieldAlt className="text-4xl" />,
        },
        {
            id: 6,
            title: "Emergency Services",
            description: "24/7 emergency electrical services for urgent repairs and power restoration when you need it most.",
            icon: <FaClock className="text-4xl" />,
        },
        {
            id: 7,
            title: "Panel Upgrades",
            description: "Modern electrical panel installations and upgrades to handle increased power demands safely and efficiently.",
            icon: <FaBolt className="text-4xl" />,
        },
        {
            id: 8,
            title: "Outlet Installation",
            description: "Professional installation of electrical outlets, USB outlets, and GFCI outlets for enhanced safety and convenience.",
            icon: <FaPlug className="text-4xl" />,
        }
    ];

    return (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
                        Our Electrical Services
                    </h2>
                    <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                        Professional electrical solutions delivered by certified experts with a commitment to safety, 
                        quality, and customer satisfaction across all residential and commercial projects.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                        >
                            {/* Icon */}
                            <div className="text-primary mb-6 flex justify-center group-hover:text-accent transition-colors duration-300">
                                {service.icon}
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-secondary mb-4 group-hover:text-primary transition-colors duration-300">
                                {service.title}
                            </h3>

                            {/* Description */}
                            <p className="text-secondary/80 mb-6 leading-relaxed text-sm">
                                {service.description}
                            </p>

                            {/* CTA Button */}
                            <button className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 w-full">
                                Learn More
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
