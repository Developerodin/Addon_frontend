"use client";
import React from "react";

interface FloorSupervisorDashboardProps {
  floorName: string;
  floorIcon: string;
  currentOrders: number;
  completedToday: number;
  inProgress: number;
  issues: number;
  floorColor: string;
}

const FloorSupervisorDashboard: React.FC<FloorSupervisorDashboardProps> = ({
  floorName,
  floorIcon,
  currentOrders,
  completedToday,
  inProgress,
  issues,
  floorColor
}) => {
  return (
    <div className="main-container">
      <div className="main-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className={floorIcon}></i> {floorName} Floor Supervisor Dashboard
                  </h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 col-lg-3">
                      <div className={`card bg-${floorColor} text-white`}>
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <i className="bx bx-list-ul fs-1"></i>
                            </div>
                            <div>
                              <h4 className="mb-0">Current Orders</h4>
                              <p className="mb-0">{currentOrders}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <div className="card bg-success text-white">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <i className="bx bx-check-circle fs-1"></i>
                            </div>
                            <div>
                              <h4 className="mb-0">Completed Today</h4>
                              <p className="mb-0">{completedToday}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <div className="card bg-warning text-white">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <i className="bx bx-time fs-1"></i>
                            </div>
                            <div>
                              <h4 className="mb-0">In Progress</h4>
                              <p className="mb-0">{inProgress}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-lg-3">
                      <div className="card bg-danger text-white">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <i className="bx bx-error fs-1"></i>
                            </div>
                            <div>
                              <h4 className="mb-0">Issues</h4>
                              <p className="mb-0">{issues}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-4">
                    <div className="col-xl-8">
                      <div className="card">
                        <div className="card-header">
                          <h5 className="card-title">{floorName} Floor Operations</h5>
                        </div>
                        <div className="card-body">
                          <p>Manage and monitor {floorName.toLowerCase()} operations efficiently.</p>
                          <div className="table-responsive">
                            <table className="table table-bordered">
                              <thead>
                                <tr>
                                  <th>Order ID</th>
                                  <th>Product</th>
                                  <th>Status</th>
                                  <th>Progress</th>
                                  <th>Assigned To</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>ORD-001</td>
                                  <td>Sample Product</td>
                                  <td><span className="badge bg-warning">In Progress</span></td>
                                  <td>75%</td>
                                  <td>John Doe</td>
                                  <td>
                                    <button className="btn btn-sm btn-primary">Update</button>
                                    <button className="btn btn-sm btn-info ms-1">View</button>
                                  </td>
                                </tr>
                                <tr>
                                  <td>ORD-002</td>
                                  <td>Sample Product 2</td>
                                  <td><span className="badge bg-success">Completed</span></td>
                                  <td>100%</td>
                                  <td>Jane Smith</td>
                                  <td>
                                    <button className="btn btn-sm btn-success">Complete</button>
                                    <button className="btn btn-sm btn-info ms-1">View</button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-4">
                      <div className="card">
                        <div className="card-header">
                          <h5 className="card-title">Quick Actions</h5>
                        </div>
                        <div className="card-body">
                          <div className="d-grid gap-2">
                            <button className="btn btn-primary">Assign New Task</button>
                            <button className="btn btn-success">Update Progress</button>
                            <button className="btn btn-warning">Report Issue</button>
                            <button className="btn btn-info">View Floor Status</button>
                            <button className="btn btn-secondary">Generate Report</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorSupervisorDashboard;
