"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { Tab } from '@headlessui/react';
import dynamic from 'next/dynamic';

// Import the rich text editor dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface TabItem {
  name: string;
  icon: string;
}

const AddItemPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [description, setDescription] = useState('');

  const tabs: TabItem[] = [
    { name: 'General', icon: 'ri-file-list-line' },
    { name: 'Data', icon: 'ri-database-2-line' },
    { name: 'Links', icon: 'ri-link' },
    { name: 'Attribute', icon: 'ri-list-check' },
    { name: 'Option', icon: 'ri-settings-line' },
    { name: 'Discount', icon: 'ri-price-tag-3-line' },
    { name: 'Special', icon: 'ri-star-line' },
    { name: 'Image', icon: 'ri-image-line' },
    { name: 'SEO', icon: 'ri-global-line' },
  ];

  return (
    <div className="main-content">
      <Seo title="Add Item"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Breadcrumb */}
          <div className="mb-4">
            <nav className="breadcrumb">
              <ol className="flex items-center space-x-3">
                <li className="breadcrumb-item"><a href="/catalog">Catalog</a></li>
                <li className="breadcrumb-item"><a href="/catalog/items">Items</a></li>
                <li className="breadcrumb-item active" aria-current="page">Add Item</li>
              </ol>
            </nav>
          </div>

          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-4">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Item</h1>
              <div className="box-tools space-x-2">
                <button type="button" className="ti-btn ti-btn-danger">
                  <i className="ri-arrow-go-back-line me-2"></i> Cancel
                </button>
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-save-line me-2"></i> Save
                </button>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                <Tab.List className="flex space-x-1 border-b">
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.name}
                      className={({ selected }: { selected: boolean }) =>
                        `px-4 py-2.5 text-sm font-medium leading-5 
                        ${selected 
                          ? 'text-primary border-b-2 border-primary outline-none'
                          : 'text-gray-500 hover:text-gray-700'
                        }`
                      }
                    >
                      <i className={`${tab.icon} me-2`}></i>
                      {tab.name}
                    </Tab>
                  ))}
                </Tab.List>

                <Tab.Panels className="mt-4">
                  {/* General Tab */}
                  <Tab.Panel>
                    <div className="grid grid-cols-12 gap-6">
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label required">Product Name</label>
                          <input type="text" className="form-control" placeholder="Enter product name"/>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <div className="h-[300px]">
                            <ReactQuill 
                              theme="snow"
                              value={description}
                              onChange={setDescription}
                              className="h-[250px]"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label required">Meta Tag Title</label>
                          <input type="text" className="form-control" placeholder="Enter meta title"/>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label">Meta Tag Description</label>
                          <textarea className="form-control" rows={3} placeholder="Enter meta description"></textarea>
                        </div>
                      </div>
                    </div>
                  </Tab.Panel>

                  {/* Data Tab */}
                  <Tab.Panel>
                    <div className="grid grid-cols-12 gap-6">
                      <div className="col-span-6">
                        <div className="form-group">
                          <label className="form-label required">Model</label>
                          <input type="text" className="form-control" placeholder="Product model"/>
                        </div>
                      </div>
                      <div className="col-span-6">
                        <div className="form-group">
                          <label className="form-label">SKU</label>
                          <input type="text" className="form-control" placeholder="Stock Keeping Unit"/>
                        </div>
                      </div>
                      <div className="col-span-6">
                        <div className="form-group">
                          <label className="form-label">Price</label>
                          <input type="number" className="form-control" placeholder="0.00"/>
                        </div>
                      </div>
                      <div className="col-span-6">
                        <div className="form-group">
                          <label className="form-label">Quantity</label>
                          <input type="number" className="form-control" placeholder="0"/>
                        </div>
                      </div>
                      <div className="col-span-6">
                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <select className="form-select">
                            <option value="1">Enabled</option>
                            <option value="0">Disabled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Tab.Panel>

                  {/* Links Tab */}
                  <Tab.Panel>
                    <div className="grid grid-cols-12 gap-6">
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label">Categories</label>
                          <select className="form-select" multiple>
                            <option>Select categories</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <div className="form-group">
                          <label className="form-label">Related Products</label>
                          <select className="form-select" multiple>
                            <option>Select related products</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Tab.Panel>

                  {/* Other tabs will be implemented similarly */}
                  <Tab.Panel>Attribute Content</Tab.Panel>
                  <Tab.Panel>Option Content</Tab.Panel>
                  <Tab.Panel>Discount Content</Tab.Panel>
                  <Tab.Panel>Special Content</Tab.Panel>
                  <Tab.Panel>Image Content</Tab.Panel>
                  <Tab.Panel>SEO Content</Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddItemPage; 