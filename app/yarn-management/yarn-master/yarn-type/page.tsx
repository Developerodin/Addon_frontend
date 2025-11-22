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
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Types" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Yarn Types</h1>
              <div className="box-tools flex items-center space-x-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={handleDownloadTemplate}
                >
                  <i className="ri-download-line me-2"></i> Download Template
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
                  className="ti-btn ti-btn-success"
                  onClick={handleImportClick}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line me-2"></i> Import
                    </>
                  )}
                </button>
                <button type="button" className="ti-btn ti-btn-info" onClick={handleExport}>
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/yarn-management/yarn-master/yarn-type/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add Yarn Type
                </Link>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
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
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search yarn types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {importProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-200"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : yarnTypes.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Yarn Types Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first yarn type.</p>
                  <Link href="/yarn-management/yarn-master/yarn-type/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Yarn Type
                  </Link>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th scope="col" className="!text-start">
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th scope="col" className="text-start">Name</th>
                          <th scope="col" className="text-start">Details</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yarnTypes.map((type, index) => (
                          <tr 
                            key={type.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedTypes.includes(type.id)}
                                onChange={() => handleTypeSelect(type.id)}
                              />
                            </td>
                            <td>{type.name}</td>
                            <td>
                              {type.details && type.details.length > 0 ? (
                                <div className="space-y-1">
                                  {type.details.map((detail, detailIdx) => {
                                    const countSizeDisplay = formatCountSize(detail.countSize);
                                    return (
                                      <div key={`${type.id}-detail-${detailIdx}`}>
                                        <span className="font-medium">{detail.subtype}</span>
                                        {countSizeDisplay && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            Count Size: {countSizeDisplay}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              <span className={`badge ${type.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                {type.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/yarn-management/yarn-master/yarn-type/edit/${type.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(type.id)}
                                  disabled={isDeleting && deleteId === type.id}
                                >
                                  {isDeleting && deleteId === type.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  ) : (
                                    <i className="ri-delete-bin-line"></i>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {getPagination(currentPage, totalPages).map((page, idx) =>
                          page === '...'
                            ? <li key={"ellipsis-" + idx} className="page-item"><span className="px-3">...</span></li>
                            : <li key={page} className="page-item">
                                <button
                                  className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                    currentPage === page 
                                    ? 'bg-primary text-white hover:bg-primary-dark' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                  }`}
                                  onClick={() => setCurrentPage(Number(page))}
                                >
                                  {page}
                                </button>
                              </li>
                        )}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YarnTypePage;

