import React from 'react';
import { ProductionOrder } from './FinalCheckingTypes';

interface Props {
  orders: ProductionOrder[];
}

const FinalCheckingStats: React.FC<Props> = ({ orders }) => {
  const active = orders.filter((o) => o.status === 'In Progress').length;
  const m1 = orders.reduce((sum, o) => sum + o.articles.reduce((s, a) => s + a.m1Quantity, 0), 0);
  const m2 = orders.reduce((sum, o) => sum + o.articles.reduce((s, a) => s + a.m2Quantity, 0), 0);
  const m3m4 = orders.reduce((sum, o) => sum + o.articles.reduce((s, a) => s + a.m3Quantity + a.m4Quantity, 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="box bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="box-body p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Active Orders</p>
              <p className="text-2xl font-bold text-white">{active}</p>
            </div>
            <div className="text-blue-200"><i className="ri-cog-line text-3xl"></i></div>
          </div>
        </div>
      </div>
      <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
        <div className="box-body p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">M1 - Good Quality</p>
              <p className="text-2xl font-bold text-white">{m1}</p>
            </div>
            <div className="text-green-200"><i className="ri-check-line text-3xl"></i></div>
          </div>
        </div>
      </div>
      <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
        <div className="box-body p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">M2 - Needs Repair</p>
              <p className="text-2xl font-bold text-white">{m2}</p>
            </div>
            <div className="text-yellow-200"><i className="ri-tools-line text-3xl"></i></div>
          </div>
        </div>
      </div>
      <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
        <div className="box-body p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">M3+M4 - Defects</p>
              <p className="text-2xl font-bold text-white">{m3m4}</p>
            </div>
            <div className="text-red-200"><i className="ri-error-warning-line text-3xl"></i></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalCheckingStats;


