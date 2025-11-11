"use client";

import React, { useState } from 'react';
import { Rack } from '../types';

interface RackManagementProps {
  racks: Rack[];
  onRackUpdate: (rack: Rack) => void;
  onRackDelete: (rackId: string) => void;
  onRackCreate: (rack: Omit<Rack, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const RackManagement: React.FC<RackManagementProps> = ({
  racks,
  onRackUpdate,
  onRackDelete,
  onRackCreate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    zone: 'A',
    row: 1,
    position: 1,
    x: 0,
    y: 0,
    width: 45,
    height: 70,
    status: 'active' as 'active' | 'maintenance' | 'blocked',
    shelves: 3
  });

  const handleCreate = () => {
    setEditingRack(null);
    setFormData({
      name: '',
      zone: 'A',
      row: 1,
      position: 1,
      x: 0,
      y: 0,
      width: 45,
      height: 70,
      status: 'active',
      shelves: 3
    });
    setIsModalOpen(true);
  };

  const handleEdit = (rack: Rack) => {
    setEditingRack(rack);
    setFormData({
      name: rack.name,
      zone: rack.zone,
      row: rack.row,
      position: rack.position,
      x: rack.x,
      y: rack.y,
      width: rack.width,
      height: rack.height,
      status: rack.status,
      shelves: rack.shelves.length
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRack) {
      // Update existing rack
      const updatedRack: Rack = {
        ...editingRack,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      onRackUpdate(updatedRack);
    } else {
      // Create new rack
      const newRack = {
        name: formData.name || `Rack ${formData.zone}-${formData.row}-${formData.position}`,
        zone: formData.zone,
        row: formData.row,
        position: formData.position,
        x: formData.x,
        y: formData.y,
        width: formData.width,
        height: formData.height,
        status: formData.status,
        shelves: Array.from({ length: formData.shelves }, (_, level) => ({
          id: `SHELF-${Date.now()}-${level}`,
          rackId: `TEMP-${Date.now()}`,
          level: level + 1,
          baskets: []
        })),
        utilization: 0
      };
      onRackCreate(newRack);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (rackId: string) => {
    if (confirm('Are you sure you want to delete this rack? This action cannot be undone.')) {
      onRackDelete(rackId);
    }
  };

  return (
    <div className="box">
      <div className="box-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="box-title">Rack Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create, edit, and remove racks from the warehouse layout.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="ti-btn ti-btn-primary whitespace-nowrap"
          >
            <i className="ri-add-line me-1"></i>
            Create Rack
          </button>
        </div>
      </div>

      <div className="box-body">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rack Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone / Row / Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shelves
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {racks.map(rack => (
                <tr key={rack.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rack.name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {rack.zone} / Row {rack.row} / Pos {rack.position}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{rack.shelves.length} shelves</div>
                    <div className="text-xs text-gray-500">
                      {rack.shelves.reduce((sum, s) => sum + s.baskets.length, 0)} baskets
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            rack.utilization >= 80 ? 'bg-green-600' :
                            rack.utilization >= 50 ? 'bg-blue-500' :
                            rack.utilization >= 25 ? 'bg-blue-300' : 'bg-gray-300'
                          }`}
                          style={{ width: `${rack.utilization}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{rack.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rack.status === 'active' ? 'bg-green-100 text-green-800' :
                      rack.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rack.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(rack)}
                      className="text-blue-600 hover:text-blue-900 me-3"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(rack.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingRack ? 'Edit Rack' : 'Create New Rack'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rack Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="ti-form-input w-full"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zone
                    </label>
                    <select
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="ti-form-select w-full"
                    >
                      {['A', 'B', 'C', 'D'].map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Row
                    </label>
                    <input
                      type="number"
                      value={formData.row}
                      onChange={(e) => setFormData({ ...formData, row: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="number"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Position
                    </label>
                    <input
                      type="number"
                      value={formData.x}
                      onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Position
                    </label>
                    <input
                      type="number"
                      value={formData.y}
                      onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shelves
                    </label>
                    <input
                      type="number"
                      value={formData.shelves}
                      onChange={(e) => setFormData({ ...formData, shelves: parseInt(e.target.value) })}
                      className="ti-form-input w-full"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="ti-form-select w-full"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="ti-btn ti-btn-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary"
                >
                  {editingRack ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RackManagement;


