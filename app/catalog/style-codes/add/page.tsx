"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import Seo from '@/shared/layout-components/seo/seo'
import { styleCodeService } from '@/shared/services/styleCodeService'
import { API_BASE_URL } from '@/shared/data/utilities/api'
import { RawMaterialBomTable, RawMaterialBomItem } from '@/app/catalog/items/components/RawMaterialBomTable'

type Status = 'active' | 'inactive'

interface FormState {
  styleCode: string
  eanCode: string
  mrp: number | ''
  brand: string
  pack: string
  status: Status
}

const AddStyleCodePage = () => {
  const router = useRouter()
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [packOptions, setPackOptions] = useState<string[]>([])
  const [form, setForm] = useState<FormState>({
    styleCode: '',
    eanCode: '',
    mrp: '',
    brand: '',
    pack: '',
    status: 'active',
  })
  const [bomItems, setBomItems] = useState<RawMaterialBomItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!form.styleCode.trim()) nextErrors.styleCode = 'Style code is required'
    if (!form.eanCode.trim()) nextErrors.eanCode = 'EAN is required'
    if (form.mrp === '' || Number(form.mrp) < 0) nextErrors.mrp = 'MRP must be 0 or more'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  useEffect(() => {
    const fetchBrandPack = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/product-attributes?limit=1000`)
        if (!res.ok) throw new Error('Failed to fetch attributes')
        const data = await res.json()
        const attributes = data?.results || []
        const getValues = (name: string) =>
          attributes
            .filter((attr: any) => (attr?.name || '').toLowerCase() === name.toLowerCase())
            .flatMap((attr: any) => attr?.optionValues || [])
            .map((val: any) => val?.name)
            .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        setBrandOptions(getValues('Brand'))
        setPackOptions(getValues('Pack'))
      } catch (error) {
        console.error('Failed to load brand/pack options', error)
      }
    }
    fetchBrandPack()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      setSubmitting(true)
      const bom =
        bomItems
          .filter((rm) => rm.rawMaterialId && (rm.quantity ?? 0) >= 0)
          .map((rm) => ({
            rawMaterial: rm.rawMaterialId,
            quantity: Number(rm.quantity),
          })) || undefined
      await styleCodeService.create({
        styleCode: form.styleCode.trim(),
        eanCode: form.eanCode.trim(),
        mrp: Number(form.mrp),
        brand: form.brand.trim() || undefined,
        pack: form.pack.trim() || undefined,
        status: form.status,
        ...(bom.length > 0 && { bom }),
      })
      toast.success('Style code created')
      router.push('/catalog/style-codes')
    } catch (error) {
      console.error('Create failed', error)
      toast.error('Failed to create style code')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="main-content">
      <Seo title="Add Style Code" />
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
          <h1 className="text-lg font-semibold text-gray-900">Add Style Code</h1>
        </div>
        <Link
          href="/catalog/style-codes"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
        >
          <i className="ri-arrow-left-line"></i>
          Back
        </Link>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title text-sm font-semibold">Details</h3>
        </div>
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="form-label text-[12px]">Style Code *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-sm ${errors.styleCode ? 'border-red-500' : ''}`}
                  value={form.styleCode}
                  onChange={(e) => handleChange('styleCode', e.target.value)}
                  placeholder="SC-001"
                />
                {errors.styleCode && <p className="text-xs text-red-500 mt-1">{errors.styleCode}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">EAN *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-sm ${errors.eanCode ? 'border-red-500' : ''}`}
                  value={form.eanCode}
                  onChange={(e) => handleChange('eanCode', e.target.value)}
                  placeholder="EAN123"
                />
                {errors.eanCode && <p className="text-xs text-red-500 mt-1">{errors.eanCode}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">MRP *</label>
                <input
                  type="number"
                  min={0}
                  className={`form-control h-9 text-sm ${errors.mrp ? 'border-red-500' : ''}`}
                  value={form.mrp}
                  onChange={(e) => handleChange('mrp', Number(e.target.value))}
                  placeholder="199"
                />
                {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">Brand</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                >
                  <option value="">Select brand</option>
                  {brandOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {form.brand && !brandOptions.includes(form.brand) && (
                    <option value={form.brand}>{form.brand}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label text-[12px]">Pack</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.pack}
                  onChange={(e) => handleChange('pack', e.target.value)}
                >
                  <option value="">Select pack</option>
                  {packOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {form.pack && !packOptions.includes(form.pack) && (
                    <option value={form.pack}>{form.pack}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label text-[12px]">Status</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <RawMaterialBomTable
              items={bomItems}
              onChange={setBomItems}
              disabled={submitting}
            />

            <div className="flex justify-end gap-2">
              <Link
                href="/catalog/style-codes"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-purple-200 bg-purple-600 text-white text-[12px] font-semibold hover:bg-purple-700"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddStyleCodePage
