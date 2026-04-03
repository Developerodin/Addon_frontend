"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { toast, Toaster } from "react-hot-toast"
import Seo from "@/shared/layout-components/seo/seo"
import { styleCodePairsService } from "@/shared/services/styleCodePairsService"
import { RawMaterialBomTable, RawMaterialBomItem } from "@/app/catalog/items/components/RawMaterialBomTable"
import { StyleCodeMultiSelect, SelectedStyleCode } from "../../components/StyleCodeMultiSelect"

type Status = "active" | "inactive"

interface FormState {
  pairStyleCode: string
  eanCode: string
  mrp: number | ""
  pack: number | ""
  status: Status
}

const EditStyleCodePairPage = () => {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [form, setForm] = useState<FormState>({
    pairStyleCode: "",
    eanCode: "",
    mrp: "",
    pack: "",
    status: "active",
  })
  const [selectedStyleCodes, setSelectedStyleCodes] = useState<SelectedStyleCode[]>([])
  const [bomItems, setBomItems] = useState<RawMaterialBomItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) void loadPair(id)
  }, [id])

  const loadPair = async (pairId: string) => {
    try {
      setLoading(true)
      const data = await styleCodePairsService.get(pairId)
      setForm({
        pairStyleCode: data.pairStyleCode,
        eanCode: data.eanCode,
        mrp: data.mrp,
        pack: data.pack ?? "",
        status: data.status,
      })
      const sc = data.styleCodes || []
      let uidCounter = 0
      setSelectedStyleCodes(
        sc.map((s) => {
          const uid = `load_${Date.now()}_${++uidCounter}`
          if (typeof s === "string") {
            return { uid, id: s, styleCode: undefined, eanCode: undefined }
          }
          return {
            uid,
            id: (s as { id?: string }).id || (s as { _id?: string })._id || "",
            styleCode: (s as { styleCode?: string }).styleCode,
            eanCode: (s as { eanCode?: string }).eanCode,
          }
        }).filter((x) => x.id)
      )
      const rawBom = data.bom
      if (Array.isArray(rawBom) && rawBom.length > 0) {
        setBomItems(
          rawBom.map((b: { rawMaterial: string | { _id?: string; id?: string; name?: string }; quantity: number }) => {
            const rm = b.rawMaterial
            const rmId =
              typeof rm === "string"
                ? rm
                : (rm as { _id?: string })?._id ?? (rm as { id?: string })?.id ?? ""
            const rmName =
              typeof rm === "object" && rm
                ? (rm as { name?: string }).name ?? ""
                : ""
            return {
              rawMaterialId: rmId,
              rawMaterialName: rmName,
              quantity: Number(b.quantity) ?? 0,
            }
          })
        )
      }
    } catch (error) {
      console.error("Failed to load style code pair", error)
      toast.error("Failed to load style code pair")
      router.push("/catalog/style-code-pairs")
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!form.pairStyleCode.trim()) nextErrors.pairStyleCode = "Pair style code is required"
    if (!form.eanCode.trim()) nextErrors.eanCode = "EAN is required"
    if (form.mrp === "" || Number(form.mrp) < 0)
      nextErrors.mrp = "MRP must be 0 or more"
    if (selectedStyleCodes.length === 0)
      nextErrors.styleCodes = "At least one style code is required"
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !id) return
    try {
      setSubmitting(true)
      const bom = bomItems
        .filter((rm) => rm.rawMaterialId && (rm.quantity ?? 0) >= 0)
        .map((rm) => ({
          rawMaterial: rm.rawMaterialId,
          quantity: Number(rm.quantity),
        }))
      await styleCodePairsService.update(id, {
        pairStyleCode: form.pairStyleCode.trim(),
        eanCode: form.eanCode.trim(),
        mrp: Number(form.mrp),
        pack: form.pack !== "" ? Number(form.pack) : undefined,
        status: form.status,
        styleCodes: selectedStyleCodes.map((s) => s.id),
        bom: bom.length > 0 ? bom : undefined,
      })
      toast.success("Style code pair updated")
      router.push("/catalog/style-code-pairs")
    } catch (error) {
      console.error("Update failed", error)
      toast.error("Failed to update style code pair")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Style Code Pair" />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4 opacity-60" />
            <p className="text-[11px] text-gray-600">Loading style code pair...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Edit Style Code Pair" />
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
          <h1 className="text-sm font-bold text-gray-800">Edit Style Code Pair</h1>
        </div>
        <Link
          href="/catalog/style-code-pairs"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100"
        >
          <i className="ri-arrow-left-line" />
          Back
        </Link>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="form-label text-[12px]">Pair Style Code *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-[12px] ${errors.pairStyleCode ? "border-red-500" : ""}`}
                  value={form.pairStyleCode}
                  onChange={(e) => handleChange("pairStyleCode", e.target.value)}
                  placeholder="PAIR001"
                />
                {errors.pairStyleCode && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.pairStyleCode}</p>
                )}
              </div>
              <div>
                <label className="form-label text-[12px]">EAN *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-[12px] ${errors.eanCode ? "border-red-500" : ""}`}
                  value={form.eanCode}
                  onChange={(e) => handleChange("eanCode", e.target.value)}
                  placeholder="EAN9999"
                />
                {errors.eanCode && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.eanCode}</p>
                )}
              </div>
              <div>
                <label className="form-label text-[12px]">MRP *</label>
                <input
                  type="number"
                  min={0}
                  className={`form-control h-9 text-[12px] ${errors.mrp ? "border-red-500" : ""}`}
                  value={form.mrp}
                  onChange={(e) => handleChange("mrp", e.target.value ? Number(e.target.value) : "")}
                  placeholder="500"
                />
                {errors.mrp && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.mrp}</p>
                )}
              </div>
              <div>
                <label className="form-label text-[12px]">Pack</label>
                <input
                  type="number"
                  min={0}
                  className="form-control h-9 text-[12px]"
                  value={form.pack}
                  onChange={(e) =>
                    handleChange("pack", e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="2"
                />
              </div>
              <div>
                <label className="form-label text-[12px]">Status</label>
                <select
                  className="form-select h-9 text-[12px]"
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value as Status)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className={errors.styleCodes ? "border border-red-200 rounded p-3" : ""}>
              <StyleCodeMultiSelect
                selected={selectedStyleCodes}
                onChange={setSelectedStyleCodes}
                disabled={submitting}
              />
              {errors.styleCodes && (
                <p className="text-[11px] text-red-500 mt-1">{errors.styleCodes}</p>
              )}
            </div>

            <RawMaterialBomTable
              items={bomItems}
              onChange={setBomItems}
              disabled={submitting}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Link
                href="/catalog/style-code-pairs"
                className="flex items-center gap-1.5 px-4 py-2 rounded border border-gray-200 text-[12px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[12px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-sm" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line text-sm" />
                    Update
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditStyleCodePairPage
