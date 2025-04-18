"use client"

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';

// Import the ListView component
import ListView from '../list-view/page';

const ListViewPage = () => {
    return (
        <div>
            <Seo title="Task List"/>
            <Pageheader title="Task List" heading="Tasks" active="List View" />
            <ListView />
        </div>
    );
};

export default ListViewPage; 