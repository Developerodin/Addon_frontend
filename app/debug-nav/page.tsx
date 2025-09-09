"use client"
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@/shared/contextapi/navigationContext';

const DebugNavPage = () => {
  const user = useSelector((state: any) => state.auth?.user);
  const authState = useSelector((state: any) => state.auth);
  const { permissions, isLoading } = useNavigation();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Navigation Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redux Auth State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Redux Auth State</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        {/* User Data */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">User Data</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        {/* Navigation Permissions */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Navigation Permissions</h2>
          <div className="mb-2">
            <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
          </div>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(permissions, null, 2)}
          </pre>
        </div>

        {/* Console Logs */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Debug Info</h2>
          <div className="space-y-2 text-sm">
            <div>User exists: {user ? 'Yes' : 'No'}</div>
            <div>User has navigation: {user?.navigation ? 'Yes' : 'No'}</div>
            <div>Permissions exist: {permissions ? 'Yes' : 'No'}</div>
            <div>Is loading: {isLoading ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugNavPage;
