import React, { useEffect, useState } from 'react';

const RoleSelector = ({ onRoleSelected }) => {
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Check if role exists in localStorage
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setRole(storedRole);
      onRoleSelected(storedRole);
    }
  }, [onRoleSelected]);

  const handleRoleSelect = (selectedRole) => {
    localStorage.setItem('userRole', selectedRole);
    setRole(selectedRole);
    onRoleSelected(selectedRole);
  };

  if (role) {
    return (
      <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000]">
        <p className="text-gray-700">Current Role: <span className="font-bold">{role}</span></p>
        <button
          onClick={() => {
            localStorage.removeItem('userRole');
            setRole(null);
            onRoleSelected(null);
          }}
          className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-lg"
        >
          Change Role
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Your Role</h2>
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect('hider')}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold"
          >
            Hider
          </button>
          <button
            onClick={() => handleRoleSelect('seeker')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold"
          >
            Seeker
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector; 