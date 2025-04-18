"use client"
import React, { Fragment } from 'react'
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const Communication = () => {
  return (
    <Fragment>
      <Seo title={"Communication"} />
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Communication</p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">Manage all your communication channels.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <div className="box hover:shadow-lg transition-all">
            <div className="box-header">
              <h5 className="box-title">Chat Communication</h5>
            </div>
            <div className="box-body">
              <p className="text-gray-500 dark:text-white/70 mb-4">
                Connect with your team members through instant messaging.
              </p>
              <Link href="/pages/communication/chats" className="ti-btn ti-btn-primary">
                <i className="ri-chat-1-line me-1"></i> Access Chats
              </Link>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="box hover:shadow-lg transition-all">
            <div className="box-header">
              <h5 className="box-title">Email Communication</h5>
            </div>
            <div className="box-body">
              <p className="text-gray-500 dark:text-white/70 mb-4">
                Manage your email communications with clients and team.
              </p>
              <Link href="/pages/communication/emails" className="ti-btn ti-btn-primary">
                <i className="ri-mail-line me-1"></i> Access Emails
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Communication 