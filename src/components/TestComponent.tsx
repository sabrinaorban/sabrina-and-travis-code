
import React from 'react';

export const TestComponent: React.FC = () => {
  return (
    <div className="p-4 bg-blue-100 rounded-md border border-blue-300">
      <h2 className="text-lg font-medium text-blue-800">Test Component</h2>
      <p className="text-blue-600">
        This component was successfully created by Travis to verify file operations.
      </p>
      <p className="text-sm text-blue-500 mt-2">
        Created on: May 11, 2025
      </p>
    </div>
  );
};

export default TestComponent;
