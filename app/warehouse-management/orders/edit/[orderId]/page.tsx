"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import HelpIcon from '@/shared/components/HelpIcon';
import { useOrders } from '@/shared/hooks/useOrders';
import { UpdateOrderData } from '@/shared/services/orderService';

interface AddressForm {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  addressLine1: string;
  addressLine2: string;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: AddressForm;
}

interface ItemForm {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

interface PaymentForm {
  method: string;
  status: string;
  amount: number;
}

interface LogisticsForm {
  status: string;
  trackingId: string;
  warehouse: string;
  picker: string;
}

interface FormData {
  source: string;
  externalOrderId: string;
  customer: CustomerForm;
  items: ItemForm[];
  payment: PaymentForm;
  logistics: LogisticsForm;
  orderStatus: string;
  meta: {
    notes: string;
  };
}

const EditOrderPage = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;
  const { getOrder, updateOrder, loading: apiLoading } = useOrders();
  
  const [formData, setFormData] = useState<FormData>({
    source: 'Website',
    externalOrderId: '',
    customer: {
      name: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        addressLine1: '',
        addressLine2: ''
      }
    },
    items: [{ sku: '', name: '', quantity: 1, price: 0 }],
    payment: {
      method: 'Credit Card',
      status: 'pending',
      amount: 0
    },
    logistics: {
      status: 'pending',
      trackingId: '',
      warehouse: 'Warehouse A',
      picker: ''
    },
    orderStatus: 'pending',
    meta: {
      notes: ''
    }
  });

  const [errors, setErrors] = useState<any>({});
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 0, name: 'Order Info', icon: 'ri-file-list-line' },
    { id: 1, name: 'Customer Details', icon: 'ri-user-line' },
    { id: 2, name: 'Items', icon: 'ri-shopping-cart-line' },
    { id: 3, name: 'Payment', icon: 'ri-bank-card-line' },
    { id: 4, name: 'Logistics', icon: 'ri-truck-line' }
  ];

  // Fetch order data on mount
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderId) {
        toast.error('Order ID not found');
        router.push('/warehouse-management/orders');
        return;
      }

      try {
        setLoading(true);
        const order = await getOrder(orderId);
        
        // Populate form with fetched data
        setFormData({
          source: order.source,
          externalOrderId: order.externalOrderId,
          customer: order.customer,
          items: order.items,
          payment: order.payment,
          logistics: order.logistics,
          orderStatus: order.orderStatus,
          meta: order.meta || { notes: '' }
        });
      } catch (error: any) {
        console.error('Failed to fetch order:', error);
        toast.error(error.message || 'Failed to load order');
        router.push('/warehouse-management/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId, getOrder, router]);

  const validateCurrentTab = (): boolean => {
    const newErrors: any = {};

    switch (currentTab) {
      case 0: // Order Info
        // Source and externalOrderId are read-only in edit mode, no validation needed
        break;

      case 1: // Customer Details
        if (!formData.customer.name.trim()) {
          newErrors['customer.name'] = 'Customer name is required';
        }
        if (!formData.customer.email.trim()) {
          newErrors['customer.email'] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer.email)) {
          newErrors['customer.email'] = 'Please enter a valid email address';
        }
        if (!formData.customer.phone.trim()) {
          newErrors['customer.phone'] = 'Phone number is required';
        }
        if (!formData.customer.address.addressLine1.trim()) {
          newErrors['customer.address.addressLine1'] = 'Address Line 1 is required';
        }
        if (!formData.customer.address.city.trim()) {
          newErrors['customer.address.city'] = 'City is required';
        }
        if (!formData.customer.address.state.trim()) {
          newErrors['customer.address.state'] = 'State is required';
        }
        if (!formData.customer.address.zipCode.trim()) {
          newErrors['customer.address.zipCode'] = 'ZIP Code is required';
        }
        if (!formData.customer.address.country.trim()) {
          newErrors['customer.address.country'] = 'Country is required';
        }
        break;

      case 2: // Items
        if (formData.items.length === 0) {
          newErrors.items = 'At least one item is required';
        } else {
          formData.items.forEach((item, index) => {
            if (!item.sku.trim()) {
              newErrors[`items.${index}.sku`] = 'SKU is required';
            }
            if (!item.name.trim()) {
              newErrors[`items.${index}.name`] = 'Product name is required';
            }
            if (item.quantity <= 0) {
              newErrors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
            }
            if (item.price <= 0) {
              newErrors[`items.${index}.price`] = 'Price must be greater than 0';
            }
          });
        }
        break;

      case 3: // Payment
        if (formData.payment.amount <= 0) {
          newErrors['payment.amount'] = 'Payment amount must be greater than 0';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllTabs = (): boolean => {
    const newErrors: any = {};

    // Order Info validation (source and externalOrderId are read-only in edit mode)

    // Customer validation
    if (!formData.customer.name.trim()) {
      newErrors['customer.name'] = 'Customer name is required';
    }
    if (!formData.customer.email.trim()) {
      newErrors['customer.email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer.email)) {
      newErrors['customer.email'] = 'Please enter a valid email address';
    }
    if (!formData.customer.phone.trim()) {
      newErrors['customer.phone'] = 'Phone number is required';
    }
    if (!formData.customer.address.addressLine1.trim()) {
      newErrors['customer.address.addressLine1'] = 'Address Line 1 is required';
    }
    if (!formData.customer.address.city.trim()) {
      newErrors['customer.address.city'] = 'City is required';
    }
    if (!formData.customer.address.state.trim()) {
      newErrors['customer.address.state'] = 'State is required';
    }
    if (!formData.customer.address.zipCode.trim()) {
      newErrors['customer.address.zipCode'] = 'ZIP Code is required';
    }
    if (!formData.customer.address.country.trim()) {
      newErrors['customer.address.country'] = 'Country is required';
    }

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.sku.trim()) {
          newErrors[`items.${index}.sku`] = 'SKU is required';
        }
        if (!item.name.trim()) {
          newErrors[`items.${index}.name`] = 'Product name is required';
        }
        if (item.quantity <= 0) {
          newErrors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
        }
        if (item.price <= 0) {
          newErrors[`items.${index}.price`] = 'Price must be greater than 0';
        }
      });
    }

    // Payment validation
    if (formData.payment.amount <= 0) {
      newErrors['payment.amount'] = 'Payment amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors((prev: any) => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleCustomerChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value
      }
    }));

    const errorKey = `customer.${field}`;
    if (errors[errorKey]) {
      setErrors((prev: any) => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        address: {
          ...prev.customer.address,
          [field]: value
        }
      }
    }));

    const errorKey = `customer.address.${field}`;
    if (errors[errorKey]) {
      setErrors((prev: any) => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const handlePaymentChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value
      }
    }));

    const errorKey = `payment.${field}`;
    if (errors[errorKey]) {
      setErrors((prev: any) => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const handleLogisticsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      logistics: {
        ...prev.logistics,
        [field]: value
      }
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Auto-calculate payment amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setFormData(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        amount: totalAmount
      }
    }));

    const errorKey = `items.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev: any) => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { sku: '', name: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
      
      // Recalculate payment amount
      const totalAmount = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      setFormData(prev => ({
        ...prev,
        payment: {
          ...prev.payment,
          amount: totalAmount
        }
      }));
    }
  };

  const nextTab = () => {
    if (validateCurrentTab()) {
      setCurrentTab(prev => Math.min(prev + 1, tabs.length - 1));
    } else {
      toast.error('Please fix the errors in the current tab');
    }
  };

  const prevTab = () => {
    setCurrentTab(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAllTabs()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      // Prepare order data for API (exclude source and externalOrderId as they cannot be updated)
      const orderData: UpdateOrderData = {
        customer: formData.customer,
        items: formData.items,
        payment: formData.payment,
        logistics: formData.logistics,
        orderStatus: formData.orderStatus,
        meta: formData.meta
      };

      console.log('Updating order data:', orderData);
      
      // Call API to update order
      const updatedOrder = await updateOrder(orderId, orderData);
      
      console.log('Order updated successfully:', updatedOrder);
      toast.success('Order updated successfully!');
      router.push('/warehouse-management/orders');
    } catch (error: any) {
      console.error('Failed to update order:', error);
      toast.error(error.message || 'Failed to update order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Edit Order" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // Order Info
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source / Channel */}
            <div>
              <label className="form-label">Source / Channel (Read-only)</label>
              <input
                type="text"
                className="form-control bg-gray-100"
                value={formData.source}
                readOnly
                disabled
              />
              <div className="text-muted text-sm mt-1">
                Cannot be modified after order creation
              </div>
            </div>

            {/* External Order ID */}
            <div>
              <label className="form-label">External Order ID (Read-only)</label>
              <input
                type="text"
                className="form-control bg-gray-100"
                value={formData.externalOrderId}
                readOnly
                disabled
              />
              <div className="text-muted text-sm mt-1">
                Cannot be modified after order creation
              </div>
            </div>

            {/* Order Status */}
            <div>
              <label className="form-label">Order Status</label>
              <select
                value={formData.orderStatus}
                onChange={(e) => handleInputChange('orderStatus', e.target.value)}
                className="form-select"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="form-label">Notes / Special Instructions</label>
              <textarea
                value={formData.meta.notes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  meta: { notes: e.target.value }
                }))}
                className="form-control"
                rows={4}
                placeholder="Special handling required, delivery instructions, gift wrapping, etc."
              />
            </div>
          </div>
        );

      case 1: // Customer Details
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium mb-4 text-gray-700">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Name */}
                <div>
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.name'] ? 'border-danger' : ''}`}
                    value={formData.customer.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    placeholder="John Doe"
                  />
                  {errors['customer.name'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.name']}</div>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className={`form-control ${errors['customer.phone'] ? 'border-danger' : ''}`}
                    value={formData.customer.phone}
                    onChange={(e) => handleCustomerChange('phone', e.target.value)}
                    placeholder="+91-9876543210"
                  />
                  {errors['customer.phone'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.phone']}</div>
                  )}
                </div>

                {/* Email Address */}
                <div className="md:col-span-2">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className={`form-control ${errors['customer.email'] ? 'border-danger' : ''}`}
                    value={formData.customer.email}
                    onChange={(e) => handleCustomerChange('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                  {errors['customer.email'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.email']}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4 text-gray-700">Shipping Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Address Line 1 */}
                <div className="md:col-span-2">
                  <label className="form-label">Building / House No. *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.address.addressLine1'] ? 'border-danger' : ''}`}
                    value={formData.customer.address.addressLine1}
                    onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                    placeholder="Flat 402, Building A-1"
                  />
                  {errors['customer.address.addressLine1'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.address.addressLine1']}</div>
                  )}
                </div>

                {/* Address Line 2 */}
                <div className="md:col-span-2">
                  <label className="form-label">Landmark (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.customer.address.addressLine2}
                    onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                    placeholder="Near City Mall"
                  />
                </div>

                {/* Locality / Street */}
                <div className="md:col-span-2">
                  <label className="form-label">Locality / Street</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.customer.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    placeholder="MG Road, Andheri West"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.address.city'] ? 'border-danger' : ''}`}
                    value={formData.customer.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="Mumbai"
                  />
                  {errors['customer.address.city'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.address.city']}</div>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="form-label">State *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.address.state'] ? 'border-danger' : ''}`}
                    value={formData.customer.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="Maharashtra"
                  />
                  {errors['customer.address.state'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.address.state']}</div>
                  )}
                </div>

                {/* Pincode */}
                <div>
                  <label className="form-label">Pincode *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.address.zipCode'] ? 'border-danger' : ''}`}
                    value={formData.customer.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    placeholder="400001"
                    maxLength={6}
                  />
                  {errors['customer.address.zipCode'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.address.zipCode']}</div>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="form-label">Country *</label>
                  <input
                    type="text"
                    className={`form-control ${errors['customer.address.country'] ? 'border-danger' : ''}`}
                    value={formData.customer.address.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    placeholder="India"
                  />
                  {errors['customer.address.country'] && (
                    <div className="text-danger text-sm mt-1">{errors['customer.address.country']}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Items
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-700">Order Items</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="ti-btn ti-btn-primary-full ti-btn-sm"
              >
                <i className="ri-add-line me-2"></i>
                Add Item
              </button>
            </div>

            {errors.items && (
              <div className="text-danger text-sm">{errors.items}</div>
            )}

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-semibold text-gray-800">Item {index + 1}</h5>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SKU */}
                    <div>
                      <label className="form-label">SKU *</label>
                      <input
                        type="text"
                        className={`form-control ${errors[`items.${index}.sku`] ? 'border-danger' : ''}`}
                        value={item.sku}
                        onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                        placeholder="SKU-001"
                      />
                      {errors[`items.${index}.sku`] && (
                        <div className="text-danger text-sm mt-1">{errors[`items.${index}.sku`]}</div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div>
                      <label className="form-label">Product Name *</label>
                      <input
                        type="text"
                        className={`form-control ${errors[`items.${index}.name`] ? 'border-danger' : ''}`}
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Product Name"
                      />
                      {errors[`items.${index}.name`] && (
                        <div className="text-danger text-sm mt-1">{errors[`items.${index}.name`]}</div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="form-label">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        className={`form-control ${errors[`items.${index}.quantity`] ? 'border-danger' : ''}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      {errors[`items.${index}.quantity`] && (
                        <div className="text-danger text-sm mt-1">{errors[`items.${index}.quantity`]}</div>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="form-label">Unit Price *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`form-control ${errors[`items.${index}.price`] ? 'border-danger' : ''}`}
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="29.99"
                      />
                      {errors[`items.${index}.price`] && (
                        <div className="text-danger text-sm mt-1">{errors[`items.${index}.price`]}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Item Total:</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₹{(item.quantity * item.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center bg-primary/10 p-4 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">Order Total:</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{formData.payment.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );

      case 3: // Payment
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Method */}
            <div>
              <label className="form-label">Payment Method *</label>
              <select
                value={formData.payment.method}
                onChange={(e) => handlePaymentChange('method', e.target.value)}
                className="form-select"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="PayPal">PayPal</option>
                <option value="Wallet">Digital Wallet</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="form-label">Payment Status</label>
              <select
                value={formData.payment.status}
                onChange={(e) => handlePaymentChange('status', e.target.value)}
                className="form-select"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="processing">Processing</option>
              </select>
            </div>

            {/* Payment Amount */}
            <div className="md:col-span-2">
              <label className="form-label">Payment Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`form-control bg-gray-50 ${errors['payment.amount'] ? 'border-danger' : ''}`}
                value={formData.payment.amount}
                readOnly
              />
              <div className="text-muted text-sm mt-1">
                Auto-calculated from order items
              </div>
              {errors['payment.amount'] && (
                <div className="text-danger text-sm mt-1">{errors['payment.amount']}</div>
              )}
            </div>
          </div>
        );

      case 4: // Logistics
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Warehouse */}
            <div>
              <label className="form-label">Warehouse *</label>
              <select
                value={formData.logistics.warehouse}
                onChange={(e) => handleLogisticsChange('warehouse', e.target.value)}
                className="form-select"
              >
                <option value="Warehouse A">Warehouse A</option>
                <option value="Warehouse B">Warehouse B</option>
                <option value="Warehouse C">Warehouse C</option>
                <option value="Warehouse D">Warehouse D</option>
              </select>
            </div>

            {/* Logistics Status */}
            <div>
              <label className="form-label">Logistics Status</label>
              <select
                value={formData.logistics.status}
                onChange={(e) => handleLogisticsChange('status', e.target.value)}
                className="form-select"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready-to-ship">Ready to Ship</option>
                <option value="shipped">Shipped</option>
                <option value="in-transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            {/* Tracking ID */}
            <div>
              <label className="form-label">Tracking ID</label>
              <input
                type="text"
                className="form-control"
                value={formData.logistics.trackingId}
                onChange={(e) => handleLogisticsChange('trackingId', e.target.value)}
                placeholder="TRACK-123456"
              />
            </div>

            {/* Picker / Assigned To */}
            <div>
              <label className="form-label">Picker / Assigned To</label>
              <input
                type="text"
                className="form-control"
                value={formData.logistics.picker}
                onChange={(e) => handleLogisticsChange('picker', e.target.value)}
                placeholder="Employee name or ID"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="main-content">
      <Seo title="Edit Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h1 className="box-title text-2xl font-semibold">Edit Order</h1>
                <HelpIcon
                  title="Edit Order"
                  content={
                    <div>
                      <p className="mb-4">
                        Update order information across multiple tabs. All changes are saved when you click "Update Order".
                      </p>
                      
                      <h4 className="font-semibold mb-2">What you can edit:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Order Info:</strong> Order status and notes (Source and Order ID are locked)</li>
                        <li><strong>Customer Details:</strong> Customer information and shipping address</li>
                        <li><strong>Items:</strong> Add, remove, or modify order items</li>
                        <li><strong>Payment:</strong> Payment method and status</li>
                        <li><strong>Logistics:</strong> Warehouse, tracking, and delivery status</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Important Notes:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Source</strong> and <strong>External Order ID</strong> cannot be changed once the order is created</li>
                        <li>These fields are displayed for reference only</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Tips:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Order total updates automatically when items change</li>
                        <li>All required fields must be completed before submission</li>
                        <li>Use Previous/Next buttons to navigate between tabs</li>
                      </ul>
                    </div>
                  }
                />
              </div>
              <div className="box-tools">
                <Link href="/warehouse-management/orders" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i> Back to Orders
                </Link>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Tab Navigation */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 border-b border-gray-200">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCurrentTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                          currentTab === tab.id
                            ? 'bg-primary text-white border-b-2 border-primary'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <i className={tab.icon}></i>
                        {tab.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="mb-6">
                  {renderTabContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div className="flex gap-3">
                    {currentTab > 0 && (
                      <button
                        type="button"
                        onClick={prevTab}
                        className="ti-btn ti-btn-secondary"
                      >
                        <i className="ri-arrow-left-line me-2"></i>
                        Previous
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {currentTab < tabs.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextTab}
                        className="ti-btn ti-btn-primary"
                      >
                        Next
                        <i className="ri-arrow-right-line ms-2"></i>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="ti-btn ti-btn-primary"
                        disabled={apiLoading}
                      >
                        {apiLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line me-2"></i>
                            Update Order
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderPage;

