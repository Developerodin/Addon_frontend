"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import {
  teamMasterService,
  PRODUCTION_FLOORS,
  TEAM_ROLES,
  TEAM_MEMBER_STATUSES,
  type ProductionFloor,
  type TeamRole,
  type TeamMemberStatus,
} from "@/shared/services/teamMasterService";

const AddTeamMemberPage = () => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [workingFloor, setWorkingFloor] = useState<ProductionFloor>("Knitting");
  const [role, setRole] = useState<TeamRole>("Team Member");
  const [status, setStatus] = useState<TeamMemberStatus>("Active");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamMemberName.trim()) {
      toast.error("Team member name is required");
      return;
    }
    setSaving(true);
    try {
      await teamMasterService.create({
        teamMemberName: teamMemberName.trim(),
        contactNumber: contactNumber.trim() || undefined,
        workingFloor,
        myTeam: [],
        role,
        status,
      });
      toast.success("Team member created");
      router.push("/catalog/team-master");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Add Team Member" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Add Team Member</h1>
            </div>
            <Link
              href="/catalog/team-master"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs"></i> Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Team Member Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={teamMemberName}
                  onChange={(e) => setTeamMemberName(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                  placeholder="e.g. +91 9876543210"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Working Floor <span className="text-red-500">*</span></label>
                <select
                  value={workingFloor}
                  onChange={(e) => setWorkingFloor(e.target.value as ProductionFloor)}
                  required
                  className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500"
                >
                  {PRODUCTION_FLOORS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                  {TEAM_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TeamMemberStatus)} className="w-full bg-white border-2 border-gray-400 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-500">
                  {TEAM_MEMBER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Link href="/catalog/team-master" className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 text-center">
                Cancel
              </Link>
              <button type="submit" disabled={saving} className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                {saving ? <i className="ri-loader-4-line animate-spin inline-block"></i> : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTeamMemberPage;
