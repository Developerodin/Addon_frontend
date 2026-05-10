"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";
import yarnCatalogService, { CreateYarnCatalogRequest, YarnCatalog } from "@/shared/services/yarnCatalogService";
import yarnTypeService, { YarnType } from "@/shared/services/yarnTypeService";
import yarnCountSizeService, { CountSize } from "@/shared/services/yarnCountSizeService";
import yarnBlendService, { YarnBlend } from "@/shared/services/yarnBlendService";
import yarnColorService, { YarnColor } from "@/shared/services/yarnColorService";
import SearchableSelect, { SearchableSelectOption } from "@/shared/components/SearchableSelect";

interface YarnCatalogFormData {
  yarnName?: string;
  yarnType: string;
  yarnSubtype?: string;
  countSize: string;
  blend: string;
  colorFamily?: string;
  pantonShade?: string;
  pantonName?: string;
  season?: string;
  gst?: number;
  remark?: string;
  hsnCode?: string;
  minQuantity?: number;
  linking: boolean;
  sampling: boolean;
  status: 'active' | 'inactive' | 'suspended';
}

interface YarnFormProps {
  initialData?: Partial<YarnCatalog>;
  onSubmit: (data: CreateYarnCatalogRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

/**
 * iOS-style on/off toggle built only from Tailwind (`peer`), so it does not depend on
 * global `.ti-switch` SCSS (which was rendering as a broken circle in this app).
 */
function CatalogWorkflowToggle({
  id,
  name,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex h-7 w-[3.25rem] shrink-0 select-none items-center ${
        disabled ? "pointer-events-none cursor-not-allowed opacity-45" : "cursor-pointer"
      }`}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span
        aria-hidden
        className="pointer-events-none block h-7 w-[3.25rem] rounded-full border border-gray-200 bg-gray-300 transition-colors duration-200 peer-checked:border-primary/40 peer-checked:bg-primary dark:border-white/10 dark:bg-neutral-600 dark:peer-checked:bg-primary"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-0.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-all duration-200 ease-out peer-checked:left-[calc(100%-1.625rem)] dark:ring-white/15"
      />
    </label>
  );
}

const YarnForm: React.FC<YarnFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Save"
}) => {
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [blends, setBlends] = useState<YarnBlend[]>([]);
  const [yarnColors, setYarnColors] = useState<YarnColor[]>([]);
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, { id: string; name: string; countSizes: string[] }[]>>({});
  
  const [formData, setFormData] = useState<YarnCatalogFormData>({
    yarnName: initialData.yarnName || "",
    yarnType: typeof initialData.yarnType === 'object' ? initialData.yarnType?.id || "" : initialData.yarnType || "",
    yarnSubtype: typeof initialData.yarnSubtype === 'object' ? initialData.yarnSubtype?.id || "" : initialData.yarnSubtype || "",
    countSize: typeof initialData.countSize === 'object' ? initialData.countSize?.id || "" : initialData.countSize || "",
    blend: typeof initialData.blend === 'object' ? initialData.blend?.id || "" : initialData.blend || "",
    colorFamily: typeof initialData.colorFamily === 'object' ? initialData.colorFamily?.id || "" : initialData.colorFamily || "",
    pantonShade: initialData.pantonShade || "",
    pantonName: initialData.pantonName || "",
    season: initialData.season || "",
    gst: initialData.gst,
    remark: initialData.remark || "",
    hsnCode: initialData.hsnCode || "",
    minQuantity: initialData.minQuantity,
    linking: initialData.linking ?? false,
    sampling: initialData.sampling ?? false,
    status: initialData.status || 'active',
  });

  useEffect(() => {
    const loadLookups = async () => {
      setIsLoadingOptions(true);
      try {
        const [typesResponse, countSizesResponse, blendsResponse, colorsResponse] = await Promise.all([
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnCountSizeService.getCountSizes({ status: 'active', limit: 1000, page: 1 }),
          yarnBlendService.getBlends({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 10000, page: 1 }),
        ]);

        const types = typesResponse.results || [];
        setYarnTypes(types);
        
        // Build subtype map with count sizes
        const subtypeEntries = types.reduce<Record<string, { id: string; name: string; countSizes: string[] }[]>>((acc, type) => {
          if (type.id && Array.isArray(type.details) && type.details.length > 0) {
            const options = type.details
              .map((detail) => {
                const subtypeId = detail.id || detail._id;
                if (!subtypeId || !detail.subtype) return null;
                
                // Extract count size IDs from the detail
                const countSizeIds: string[] = [];
                if (detail.countSize && Array.isArray(detail.countSize)) {
                  detail.countSize.forEach((cs) => {
                    if (typeof cs === 'string') {
                      countSizeIds.push(cs);
                    } else if (typeof cs === 'object' && cs !== null) {
                      const id = cs.id || cs._id;
                      if (id) countSizeIds.push(id);
                    }
                  });
                }
                
                return { id: subtypeId, name: detail.subtype, countSizes: countSizeIds };
              })
              .filter(Boolean) as { id: string; name: string; countSizes: string[] }[];
            if (options.length > 0) {
              acc[type.id] = options;
            }
          }
          return acc;
        }, {});
        setYarnSubtypeMap(subtypeEntries);
        
        setCountSizes(countSizesResponse.results || []);
        setBlends(blendsResponse.results || []);
        
        // Ensure colors are loaded from API
        const colors = colorsResponse.results || [];
        console.log('Colors loaded from API:', colors.length, colors);
        if (colors.length === 0) {
          console.warn('No colors found from API. Please check if colors are created in Color Master.');
        }
        setYarnColors(colors);
      } catch (error) {
        console.error('Error loading yarn data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn data');
        // Set empty arrays on error to prevent form from being stuck
        setYarnTypes([]);
        setCountSizes([]);
        setBlends([]);
        setYarnColors([]);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadLookups();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'status') {
      setFormData((prev) => ({
        ...prev,
        status: value as 'active' | 'inactive' | 'suspended',
      }));
      return;
    }

    if (name === 'gst') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        gst: numValue,
      }));
      return;
    }

    if (name === 'minQuantity') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        minQuantity: numValue,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Persists optional catalog boolean flags from checkbox controls.
   * @param e - Checkbox change event; `name` must be `linking` or `sampling`.
   */
  const handleCatalogBooleanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name !== "linking" && name !== "sampling") {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleYarnTypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      yarnType: value,
      yarnSubtype: "", // Reset subtype when type changes
      countSize: "", // Reset count size when type changes
    }));
  }, []);

  const handleYarnSubtypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      yarnSubtype: value,
      countSize: "", // Reset count size when subtype changes
    }));
  }, []);

  const getSubtypeOptions = useCallback(
    (yarnTypeId: string) => {
      if (!yarnTypeId) return [];
      return yarnSubtypeMap[yarnTypeId] || [];
    },
    [yarnSubtypeMap],
  );

  const getCountSizeOptions = useCallback(
    (yarnTypeId: string, yarnSubtypeId?: string) => {
      if (!yarnTypeId) return [];
      if (!yarnSubtypeId) {
        // If no subtype selected, show all count sizes
        return countSizes;
      }
      const subtypes = yarnSubtypeMap[yarnTypeId] || [];
      const selectedSubtype = subtypes.find((st) => st.id === yarnSubtypeId);
      if (!selectedSubtype || !selectedSubtype.countSizes || selectedSubtype.countSizes.length === 0) {
        // If subtype has no count sizes, show all count sizes
        return countSizes;
      }
      // Filter count sizes to only show those in the subtype's countSize array
      return countSizes.filter((cs) => selectedSubtype.countSizes.includes(cs.id));
    },
    [yarnSubtypeMap, countSizes],
  );

  const yarnTypeOptions = useMemo(
    () =>
      yarnTypes.filter((type) => {
        if (!type?.status) return false;
        return type.status.toLowerCase() === 'active';
      }),
    [yarnTypes],
  );

  const blendOptions = useMemo(
    () =>
      blends.filter((blend) => {
        if (!blend?.status) return false;
        return blend.status.toLowerCase() === 'active';
      }),
    [blends],
  );

  const colorOptions = useMemo(
    () =>
      yarnColors.filter((color) => {
        if (!color?.status) return false;
        return color.status.toLowerCase() === 'active';
      }),
    [yarnColors],
  );

  const subtypeOptions = useMemo(() => getSubtypeOptions(formData.yarnType), [getSubtypeOptions, formData.yarnType]);
  const countSizeOptions = useMemo(
    () => getCountSizeOptions(formData.yarnType, formData.yarnSubtype),
    [getCountSizeOptions, formData.yarnType, formData.yarnSubtype],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.yarnType.trim()) {
      toast.error("Yarn Type is required");
      return;
    }
    if (!formData.countSize.trim()) {
      toast.error("Count Size is required");
      return;
    }
    if (!formData.blend.trim()) {
      toast.error("Blend is required");
      return;
    }
    if (formData.gst !== undefined && (formData.gst < 0 || formData.gst > 100)) {
      toast.error("GST must be between 0 and 100");
      return;
    }

    try {
      const payload: CreateYarnCatalogRequest = {
        yarnName: formData.yarnName?.trim() || undefined,
        yarnType: formData.yarnType,
        yarnSubtype: formData.yarnSubtype?.trim() || undefined,
        countSize: formData.countSize,
        blend: formData.blend,
        colorFamily: formData.colorFamily?.trim() || undefined,
        pantonShade: formData.pantonShade?.trim() || undefined,
        pantonName: formData.pantonName?.trim() || undefined,
        season: formData.season?.trim() || undefined,
        gst: formData.gst,
        remark: formData.remark?.trim() || undefined,
        hsnCode: formData.hsnCode?.trim() || undefined,
        minQuantity: formData.minQuantity,
        linking: formData.linking,
        sampling: formData.sampling,
        status: formData.status,
      };

      await onSubmit(payload);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const isFormDisabled = isLoadingOptions || yarnTypeOptions.length === 0 || blendOptions.length === 0 || countSizes.length === 0;

  return (
    <>
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Yarn Name (Optional - auto-generated if not provided) */}
          {/* <div>
            <label className="form-label">
              Yarn Name <span className="text-xs text-gray-400">(Optional - auto-generated if not provided)</span>
            </label>
            <input
              type="text"
              name="yarnName"
              value={formData.yarnName}
              onChange={handleInputChange}
              className="form-control"
              placeholder="Leave empty for auto-generation"
              disabled={isLoadingOptions}
            />
          </div> */}

          {/* Yarn Type */}
          <div>
            <label className="form-label">
              Yarn Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={yarnTypeOptions.map((type) => ({ id: type.id, name: type.name }))}
              value={formData.yarnType}
              onChange={(value) => handleYarnTypeChange(value)}
              placeholder="Type to search yarn type..."
              disabled={isLoadingOptions}
              required
              emptyMessage="No yarn types available"
              noOptionsMessage="No yarn types match your search"
            />
          </div>

          {/* Yarn Subtype */}
          <div>
            <label className="form-label">
              Yarn Subtype
              {subtypeOptions.length > 0 ? (
                <span className="text-xs text-gray-400 ms-1">(Optional)</span>
              ) : (
                <span className="text-xs text-gray-400 ms-1">(No subtypes available)</span>
              )}
            </label>
            <SearchableSelect
              options={subtypeOptions.map((subtype) => ({ id: subtype.id, name: subtype.name }))}
              value={formData.yarnSubtype || ""}
              onChange={(value) => handleYarnSubtypeChange(value)}
              placeholder="Type to search yarn subtype..."
              disabled={isLoadingOptions || !formData.yarnType || subtypeOptions.length === 0}
              emptyMessage="No subtypes available for selected yarn type"
              noOptionsMessage="No subtypes match your search"
            />
          </div>

          {/* Count Size */}
          <div>
            <label className="form-label">
              Count Size <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={countSizeOptions.map((countSize) => ({ id: countSize.id, name: countSize.name }))}
              value={formData.countSize}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, countSize: value }));
              }}
              placeholder="Type to search count size..."
              disabled={isLoadingOptions || countSizeOptions.length === 0}
              required
              emptyMessage="No count sizes available"
              noOptionsMessage="No count sizes match your search"
            />
            {formData.yarnSubtype && countSizeOptions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No count sizes available for selected subtype</p>
            )}
          </div>

          {/* Blend */}
          <div>
            <label className="form-label">
              Blend <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={blendOptions.map((blend) => ({ id: blend.id, name: blend.name }))}
              value={formData.blend}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, blend: value }));
              }}
              placeholder="Type to search blend..."
              disabled={isLoadingOptions}
              required
              emptyMessage="No blends available"
              noOptionsMessage="No blends match your search"
            />
          </div>

          {/* Color Family */}
          <div>
            <label className="form-label">
              Color Family <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <SearchableSelect
              options={colorOptions.map((color) => ({
                id: color.id,
                name: `${color.name}${color.colorCode ? ` (${color.colorCode})` : ''}`,
              }))}
              value={formData.colorFamily || ""}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, colorFamily: value }));
              }}
              placeholder="Type to search color..."
              disabled={isLoadingOptions}
              emptyMessage="No colors available. Please add colors in Color Master."
              noOptionsMessage="No colors match your search"
            />
            {colorOptions.length === 0 && !isLoadingOptions && (
              <p className="text-xs text-warning mt-1">
                <i className="ri-alert-line me-1"></i>
                No active colors found. Please add colors in Color Master first.
              </p>
            )}
          </div>

          {/* Panton Shade */}
          <div>
            <label className="form-label">Panton Shade</label>
            <input
              type="text"
              name="pantonShade"
              value={formData.pantonShade}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., PMS 186 C"
              disabled={isLoadingOptions}
            />
          </div>

          {/* Panton Name */}
          <div>
            <label className="form-label">Panton Name</label>
            <input
              type="text"
              name="pantonName"
              value={formData.pantonName}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., Bright Red"
              disabled={isLoadingOptions}
            />
          </div>

          {/* Season */}
          <div>
            <label className="form-label">Season</label>
            <input
              type="text"
              name="season"
              value={formData.season}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., Spring 2024"
              disabled={isLoadingOptions}
            />
          </div>

          {/* GST */}
          <div>
            <label className="form-label">GST (%)</label>
            <input
              type="number"
              name="gst"
              value={formData.gst || ""}
              onChange={handleInputChange}
              className="form-control"
              placeholder="0-100"
              min="0"
              max="100"
              step="0.01"
              disabled={isLoadingOptions}
            />
          </div>

          {/* HSN Code */}
          <div>
            <label className="form-label">HSN Code</label>
            <input
              type="text"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., 52051200"
              disabled={isLoadingOptions}
            />
          </div>

          {/* Min Quantity */}
          <div>
            <label className="form-label">
              Min Quantity in kg <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <input
              type="number"
              name="minQuantity"
              value={formData.minQuantity || ""}
              onChange={handleInputChange}
              className="form-control"
              placeholder="Minimum quantity in kg"
              min="0"
              step="0.01"
              disabled={isLoadingOptions}
            />
          </div>

          {/* Status */}
          <div>
            <label className="form-label">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-select"
              disabled={isLoadingOptions}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Optional workflow toggles — full width for clearer layout */}
        <section
          className="rounded-xl border border-defaultborder dark:border-white/10 bg-white dark:bg-bodybg shadow-sm overflow-hidden"
          aria-labelledby="yarn-catalog-workflow-heading"
        >
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-defaultborder/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03]">
            <h3
              id="yarn-catalog-workflow-heading"
              className="text-sm font-semibold text-defaulttextcolor dark:text-white tracking-tight"
            >
              Linking &amp; Sampling
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50 leading-relaxed max-w-2xl">
              Optional flags for downstream workflows. Leave off if this catalog entry is not used for linking or sampling.
            </p>
          </div>
          <div className="divide-y divide-defaultborder dark:divide-white/10">
            <div className="flex items-start sm:items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
                <label
                  htmlFor="yarn-catalog-linking"
                  className="text-sm font-medium text-defaulttextcolor dark:text-white cursor-pointer"
                >
                  Linking
                </label>
                <p className="text-xs text-gray-500 dark:text-white/45 mt-1 leading-snug">
                  Enable when this yarn is part of linking operations.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:mt-0 mt-1">
                <span
                  className="text-xs font-semibold tabular-nums text-gray-500 dark:text-white/55 min-w-[1.75rem] text-end"
                  aria-hidden
                >
                  {formData.linking ? "On" : "Off"}
                </span>
                <CatalogWorkflowToggle
                  id="yarn-catalog-linking"
                  name="linking"
                  checked={formData.linking}
                  onChange={handleCatalogBooleanChange}
                  disabled={isLoadingOptions}
                />
              </div>
            </div>
            <div className="flex items-start sm:items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
                <label
                  htmlFor="yarn-catalog-sampling"
                  className="text-sm font-medium text-defaulttextcolor dark:text-white cursor-pointer"
                >
                  Sampling
                </label>
                <p className="text-xs text-gray-500 dark:text-white/45 mt-1 leading-snug">
                  Enable when this yarn is part of sampling workflows.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:mt-0 mt-1">
                <span
                  className="text-xs font-semibold tabular-nums text-gray-500 dark:text-white/55 min-w-[1.75rem] text-end"
                  aria-hidden
                >
                  {formData.sampling ? "On" : "Off"}
                </span>
                <CatalogWorkflowToggle
                  id="yarn-catalog-sampling"
                  name="sampling"
                  checked={formData.sampling}
                  onChange={handleCatalogBooleanChange}
                  disabled={isLoadingOptions}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Remarks */}
        <div>
          <label className="form-label">Remarks</label>
          <textarea
            name="remark"
            value={formData.remark}
            onChange={handleInputChange}
            className="form-control"
            rows={4}
            placeholder="Additional notes or remarks..."
            disabled={isLoadingOptions}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="ti-btn ti-btn-light"
            disabled={isSubmitting || isLoadingOptions}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ti-btn ti-btn-primary"
            disabled={isSubmitting || isFormDisabled}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="ri-save-line me-2"></i>
                {submitButtonText}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default YarnForm;
