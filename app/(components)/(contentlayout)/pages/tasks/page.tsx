"use client"
import KanbanBoard from './kanban-board/page';
import Link from 'next/link';

const TasksPage = () => {
    return (
        <div>
            <div className="grid grid-cols-12 gap-x-6">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-xl font-semibold">Tasks</h2>
                                <Link href="/pages/tasks/list" 
                                    className="ti-btn ti-btn-primary">
                                    Switch to List View
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <KanbanBoard />
        </div>
    );
};

export default TasksPage; 