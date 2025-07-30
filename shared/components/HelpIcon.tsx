import React, { useState } from 'react';
import HelpModal from './HelpModal';

interface HelpIconProps {
  title: string;
  content: React.ReactNode;
  className?: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ title, content, className = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        onClick={openModal}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors duration-200 shadow-lg hover:shadow-xl ${className}`}
        title="Help"
        aria-label="Help"
      >
        <i className="ri-information-line text-lg"></i>
      </button>
      
      <HelpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={title}
        content={content}
      />
    </>
  );
};

export default HelpIcon; 