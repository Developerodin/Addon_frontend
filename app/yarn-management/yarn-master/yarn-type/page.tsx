"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnTypeService, { BulkImportYarnType, YarnType, YarnTypeDetail } from '@/shared/services/yarnTypeService';
import yarnCountSizeService from '@/shared/services/yarnCountSizeService';
import * as XLSX from 'xlsx';

const YarnTypePage = () => {
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const formatCountSize = (countSize?: YarnTypeDetail['countSize']) => {
    if (!countSize || countSize.length === 0) return '';

    const firstItem = countSize[0];

    if (typeof firstItem === 'string') {
      return firstItem;
    }

    if (firstItem && typeof firstItem === 'object') {
      return firstItem.name || firstItem.id || firstItem._id || '';
    }

    return '';
  };

  useEffect(() => {
    fetchYarnTypes();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchYarnTypes = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchQuery.trim()) {
        params.name = searchQuery.trim();
      }
      const data = await yarnTypeService.getTypes(params);
      setYarnTypes(data.results || []);
      setTotalPages(data.totalPages || 1);
      setTotalResults(data.totalResults || 0);
      setSelectedTypes([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching yarn types:', error);
      toast.error('Failed to fetch yarn types');
      setYarnTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  type YarnTypeSheetRow = {
    ID?: string;
    Name?: string;
    'Yarn Name'?: string;
    Status?: string;
    Subtype?: string;
    'Subtype ID'?: string;
    'Count Size Names'?: string;
    'Count Size IDs'?: string;
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const templateRows = [
        {
          ID: '',
          Name: 'Combed Cotton',
          Status: 'active',
          Subtype: 'Combed 40s',
          'Subtype ID': '',
          'Count Size IDs': '',
        },
        {
          ID: '',
          Name: 'Combed Cotton',
          Status: 'active',
          Subtype: 'Combed 44s',
          'Subtype ID': '',
          'Count Size IDs': '',
        },
        {
          ID: '',
          Name: 'Carded Cotton',
          Status: 'inactive',
          Subtype: '',
          'Subtype ID': '',
          'Count Size IDs': '',
        },
      ];

      const yarnTypesSheet = XLSX.utils.json_to_sheet(templateRows);
      XLSX.utils.book_append_sheet(workbook, yarnTypesSheet, 'YarnTypes');
      workbook.SheetNames = ['YarnTypes'];

      XLSX.writeFile(workbook, 'yarn-types-template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading yarn type template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImportClick = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const handleExport = async () => {
    try {
      const [typesResponse, countSizeResponse] = await Promise.all([
        yarnTypeService.getTypes({ page: 1, limit: 10000 }),
        yarnCountSizeService.getCountSizes({ page: 1, limit: 10000 }),
      ]);

      const allTypes = typesResponse.results || [];
      const exportSource =
        selectedTypes.length > 0 ? allTypes.filter(type => selectedTypes.includes(type.id)) : allTypes;

      if (exportSource.length === 0) {
        toast.error('No yarn types available for export');
        return;
      }

      const countSizeById = new Map(
        (countSizeResponse.results || []).map(countSize => [countSize.id, countSize.name]),
      );

      const singleSheetData = exportSource.flatMap(type => {
        const baseRow = {
          ID: type.id,
          Name: type.name,
          Status: type.status,
        };

        if (!type.details || type.details.length === 0) {
          return baseRow;
        }

        return type.details.map(detail => {
          const countSizeRefs = detail.countSize || [];
          const countSizeIds = countSizeRefs
            .map(item => {
              if (typeof item === 'string') return item;
              if (typeof item === 'object') {
                return item.id || item._id || '';
              }
              return '';
            })
            .filter(Boolean);

          const countSizeNames = countSizeRefs
            .map(item => {
              if (typeof item === 'object' && item.name) {
                return item.name;
              }
              const id =
                typeof item === 'string'
                  ? item
                  : typeof item === 'object'
                  ? item.id || item._id || ''
                  : '';
              if (!id) return '';
              return countSizeById.get(id) || id;
            })
            .filter(Boolean);

          return {
            ...baseRow,
            Subtype: detail.subtype,
            'Subtype ID': detail.id || detail._id || '',
            'Count Size Names': countSizeNames.join(', '),
            'Count Size IDs': countSizeIds.join(', '),
          };
        });
      });

      const workbook = XLSX.utils.book_new();
      const yarnTypesSheet =
        singleSheetData.length > 0
          ? XLSX.utils.json_to_sheet(singleSheetData)
          : XLSX.utils.json_to_sheet([
              {
                ID: '',
                Name: '',
                Status: '',
                Subtype: '',
                'Subtype ID': '',
                'Count Size Names': '',
                'Count Size IDs': '',
              },
            ]);
      XLSX.utils.book_append_sheet(workbook, yarnTypesSheet, 'YarnTypes');
      workbook.SheetNames = ['YarnTypes'];

      XLSX.writeFile(workbook, 'yarn-types.xlsx');
      toast.success('Yarn types exported successfully');
    } catch (error) {
      console.error('Error exporting yarn types:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export yarn types');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async event => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('Unable to read file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('Import file is empty');
        }

        const yarnTypesSheetName = workbook.SheetNames[0];
        const yarnTypesSheet = workbook.Sheets[yarnTypesSheetName];

        const yarnTypeRows = XLSX.utils.sheet_to_json<YarnTypeSheetRow>(yarnTypesSheet, { defval: '' });

        if (yarnTypeRows.length === 0) {
          throw new Error('Yarn types sheet is empty');
        }

        const [existingTypesResponse, countSizeResponse] = await Promise.all([
          yarnTypeService.getTypes({ page: 1, limit: 10000 }),
          yarnCountSizeService.getCountSizes({ page: 1, limit: 10000 }),
        ]);

        const existingTypes = existingTypesResponse.results || [];
        const countSizes = countSizeResponse.results || [];

        const typesById = new Map(existingTypes.map(type => [type.id, type]));
        const typesByName = new Map(existingTypes.map(type => [type.name.trim().toLowerCase(), type]));

        const countSizeById = new Map(countSizes.map(countSize => [countSize.id, countSize]));
        const countSizeByName = new Map(
          countSizes.map(countSize => [countSize.name.trim().toLowerCase(), countSize]),
        );

        const typeEntries = new Map<string, BulkImportYarnType>();
        const aliasMap = new Map<string, string>();
        const rowErrors: string[] = [];

        let processed = 0;
        for (const row of yarnTypeRows) {
          try {
            const rawId = row.ID?.toString().trim() ?? '';
            const rawName = row.Name?.toString().trim() ?? '';
            const rawYarnName = row['Yarn Name']?.toString().trim() ?? '';
            const rawStatusValue = row.Status?.toString().trim() ?? '';
            const subtypeRaw = row.Subtype?.toString().trim() ?? '';
            const countSizeNamesRaw = row['Count Size Names']?.toString() ?? '';
            const countSizeIdsRaw = row['Count Size IDs']?.toString() ?? '';

            const hasContent = [
              rawId,
              rawName,
              rawYarnName,
              rawStatusValue,
              subtypeRaw,
              countSizeNamesRaw?.trim?.(),
              countSizeIdsRaw?.trim?.(),
            ].some(value => Boolean(value && value.toString().trim()));

            if (!hasContent) {
              continue;
            }

            if (!rawName) {
              throw new Error('Name is required');
            }

            const rawStatus = rawStatusValue.toLowerCase() || 'active';
            const status: 'active' | 'inactive' =
              rawStatus === 'inactive' ? 'inactive' : 'active';

            let targetTypeId: string | undefined;
            if (rawId && typesById.has(rawId)) {
              targetTypeId = rawId;
            } else {
              const existingByName = typesByName.get(rawName.toLowerCase());
              if (existingByName) {
                targetTypeId = existingByName.id;
              }
            }

            const candidateKeys = [
              ...(targetTypeId ? [`id:${targetTypeId}`] : []),
              ...(rawId ? [`id:${rawId}`] : []),
              `name:${rawName.toLowerCase()}`,
            ];

            let entryKey: string | undefined;
            for (const candidate of candidateKeys) {
              const resolved = aliasMap.get(candidate) || candidate;
              if (resolved && typeEntries.has(resolved)) {
                entryKey = resolved;
                break;
              }
            }

            if (!entryKey) {
              entryKey = candidateKeys[0] || `name:${rawName.toLowerCase()}`;
              typeEntries.set(entryKey, {
                ...(targetTypeId ? { id: targetTypeId } : {}),
                name: rawName,
                status,
                ...(rawYarnName ? { yarnName: rawYarnName } : {}),
                details: [],
              });
            }

            const entry = typeEntries.get(entryKey)!;

            if (targetTypeId && !entry.id) {
              entry.id = targetTypeId;
            }

            if (entry.status !== status) {
              rowErrors.push(
                `Conflicting status for yarn type "${rawName}" detected. Using "${entry.status}".`,
              );
            }

            if (rawYarnName) {
              if (!entry.yarnName) {
                entry.yarnName = rawYarnName;
              } else if (entry.yarnName.trim().toLowerCase() !== rawYarnName.toLowerCase()) {
                rowErrors.push(
                  `Conflicting yarn name for yarn type "${rawName}" detected. Using "${entry.yarnName}".`,
                );
              }
            }

            candidateKeys.forEach(candidate => aliasMap.set(candidate, entryKey!));

            if (subtypeRaw) {
              const countSizeIdTokens = countSizeIdsRaw
                ? countSizeIdsRaw
                    .split(/[,;]+/)
                    .map(token => token.trim())
                    .filter(Boolean)
                : [];
              const countSizeNameTokens = countSizeNamesRaw
                ? countSizeNamesRaw
                    .split(/[,;]+/)
                    .map(token => token.trim())
                    .filter(Boolean)
                : [];

              const uniqueCountSizeIds = new Set<string>(countSizeIdTokens);

              const missingNameTokens: string[] = [];
              countSizeNameTokens.forEach(token => {
                const match = countSizeByName.get(token.toLowerCase());
                if (match) {
                  uniqueCountSizeIds.add(match.id);
                } else {
                  missingNameTokens.push(token);
                }
              });

              const invalidIdTokens = countSizeIdTokens.filter(idToken => !countSizeById.has(idToken));

              if (missingNameTokens.length > 0) {
                console.warn(
                  `Count size name(s) not found for "${rawName || rawId}": ${missingNameTokens.join(', ')}`,
                );
                rowErrors.push(
                  `Count size name(s) not found for "${rawName}": ${missingNameTokens.join(', ')}`,
                );
              }

              if (invalidIdTokens.length > 0) {
                console.warn(
                  `Count size ID(s) not found for "${rawName || rawId}": ${invalidIdTokens.join(', ')}`,
                );
                rowErrors.push(
                  `Count size ID(s) not found for "${rawName}": ${invalidIdTokens.join(', ')}`,
                );
              }

              const detailPayload: YarnTypeDetail = {
                subtype: subtypeRaw,
                ...(uniqueCountSizeIds.size > 0 ? { countSize: Array.from(uniqueCountSizeIds) } : {}),
              };

              entry.details = [...(entry.details || []), detailPayload];
            }
          } catch (rowError) {
            const errorMessage =
              rowError instanceof Error ? rowError.message : 'Unknown error importing row';
            console.error('Error importing yarn type row:', rowError);
            rowErrors.push(errorMessage);
          } finally {
            processed += 1;
            setImportProgress(Math.round((processed / yarnTypeRows.length) * 100));
          }
        }

        const yarnTypePayloads = Array.from(typeEntries.values()).map(entry => {
          const payload: BulkImportYarnType = {
            ...(entry.id ? { id: entry.id } : {}),
            name: entry.name,
            status: entry.status,
            ...(entry.yarnName ? { yarnName: entry.yarnName } : {}),
            ...(entry.details && entry.details.length > 0 ? { details: entry.details } : {}),
          };
          return payload;
        });

        if (yarnTypePayloads.length === 0) {
          throw new Error('No valid yarn types found for bulk import');
        }

        const response = await yarnTypeService.bulkImport({
          yarnTypes: yarnTypePayloads,
          batchSize: Math.min(50, Math.max(1, yarnTypePayloads.length)),
        });

        await fetchYarnTypes();

        const hasRowErrors = rowErrors.length > 0;
        const hasResponseErrors = Boolean(response?.errors && response.errors.length > 0);

        if (hasResponseErrors) {
          console.warn('Bulk import completed with errors:', response.errors);
        }
        if (hasRowErrors) {
          console.warn('Rows skipped during bulk import:', rowErrors);
        }

        if (hasResponseErrors || hasRowErrors) {
          const totalErrors =
            (response?.errors?.length || 0) + rowErrors.length;
          toast.error(
            `Import completed with ${totalErrors} error${totalErrors === 1 ? '' : 's'}. Check console for details.`,
          );
        } else {
          toast.success(response?.message ?? 'Yarn types imported successfully');
        }
      } catch (error) {
        console.error('Error processing yarn type import file:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to process import file');
      } finally {
        setImportProgress(null);
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read import file');
      setImportProgress(null);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDelete = async (typeId: string) => {
    if (!window.confirm('Are you sure you want to delete this yarn type?')) return;
    
    setIsDeleting(true);
    setDeleteId(typeId);
    try {
      await yarnTypeService.deleteType(typeId);
      toast.success('Yarn type deleted successfully');
      await fetchYarnTypes();
    } catch (error) {
      toast.error('Failed to delete yarn type');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(yarnTypes.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleTypeSelect = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(id => id !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Yarn Types" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Types</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={handleDownloadTemplate}
              >
                <i className="ri-download-line"></i> Template
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                    Importing
                  </>
                ) : (
                  <>
                    <i className="ri-file-excel-2-line"></i> Import
                  </>
                )}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={handleExport}
              >
                <i className="ri-download-2-line"></i> Export
              </button>
              <Link
                href="/yarn-management/yarn-master/yarn-type/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line"></i> Add
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-gray-600">Rows:</label>
              <select
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>

          {importProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              ></div>
              <div className="text-[10px] text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16 min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
            </div>
          ) : yarnTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-2">No Yarn Types</h3>
              <Link
                href="/yarn-management/yarn-master/yarn-type/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
              >
                <i className="ri-add-line"></i> Add First
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                        />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Details</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                      <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yarnTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type.id)}
                            onChange={() => handleTypeSelect(type.id)}
                            className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">{type.name}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                          {type.details && type.details.length > 0 ? (
                            <div className="space-y-1">
                              {type.details.map((detail, detailIdx) => {
                                const countSizeDisplay = formatCountSize(detail.countSize);
                                return (
                                  <div key={`${type.id}-detail-${detailIdx}`} className="text-[11px]">
                                    <span className="font-medium text-gray-800">{detail.subtype}</span>
                                    {countSizeDisplay && (
                                      <span className="ml-1.5 text-gray-500">({countSizeDisplay})</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${type.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {type.status}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/yarn-management/yarn-master/yarn-type/edit/${type.id}`}
                              className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </Link>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                              onClick={() => handleDelete(type.id)}
                              disabled={isDeleting && deleteId === type.id}
                            >
                              {isDeleting && deleteId === type.id ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <i className="ri-delete-bin-line text-sm"></i>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
                <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                  Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
                </div>
                <nav className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {getPagination(currentPage, totalPages).map((page, idx) =>
                    page === '...' ? (
                      <span key={'ellipsis-' + idx} className="px-2 text-[11px] text-gray-400">...</span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${
                          currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        onClick={() => setCurrentPage(Number(page))}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YarnTypePage;

