"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { DatePicker } from "@/components/ui/date-picker";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import CSVExportPanel from "@/components/ui/tables/CSVExportPanel";

interface PaginatedTableProps {
  emptyText?: string;
  enableSearch?: boolean;
  enableDepartmentFilter?: boolean;
  enableRoleFilter?: boolean;
  enableStatusFilter?: boolean;
  enableEmployeeFilter?: boolean;
  enableZaloLinkStatusFilter?: boolean;
  enableCategoriesFilter?: boolean;
  availableEmployees?: Option[];
  enableDateRangeFilter?: boolean;
  enableSingleDateFilter?: boolean;
  enablePageSize?: boolean;
  availableDepartments?:
    | string[]
    | { value: number | string; label: string }[] // ✅ Support cả number và string
    | readonly { readonly value: number | string; readonly label: string }[];
  availableRoles?: string[];
  availableStatuses?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
  availableZaloLinkStatuses?: { value: string | number; label: string }[];
  availableCategories?:
    | string[]
    | { value: string; label: string }[]
    | readonly { readonly value: string; readonly label: string }[];
  availableBrands?: string[];
  dateRangeLabel?: string;
  singleDateLabel?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  children: React.ReactNode;
  onFilterChange?: (filters: Filters) => void;
  loading?: boolean;
  // Thêm prop để pass initial filters từ parent
  initialFilters?: Partial<Filters>;
  // Thêm flag để kiểm soát việc sync
  preserveFiltersOnEmpty?: boolean;
  filterClassNames?: {
    search?: string;
    departments?: string;
    roles?: string;
    statuses?: string;
    categories?: string;
    brands?: string;
    dateRange?: string;
  };
  buttonClassNames?: {
    export?: string;
    reset?: string;
    prev?: string;
    next?: string;
  };
  getExportData?: () => { headers: string[]; data: (string | number)[][] };
  canExport?: boolean;
  onResetFilter?: () => void;
  preventEmptyFilterCall?: boolean;
  onDepartmentChange?: (departments: (string | number)[]) => void;
}

export type Filters = {
  search: string;
  departments: (string | number)[];
  roles: (string | number)[];
  statuses: (string | number)[];
  zaloLinkStatuses?: (string | number)[];
  categories: (string | number)[];
  brands: (string | number)[];
  dateRange: DateRange;
  singleDate?: Date | string; // Support both Date and string
  employees: (string | number)[];
  sort?: { field: string; direction: "asc" | "desc" } | undefined;
};

export default function PaginatedTable({
  enableSearch,
  enableDepartmentFilter,
  enableRoleFilter,
  enableStatusFilter,
  enableEmployeeFilter,
  availableEmployees = [],
  // Thêm các props mới
  enableZaloLinkStatusFilter,
  enableCategoriesFilter,
  availableZaloLinkStatuses = [
    { value: 0, label: "Chưa liên kết" },
    { value: 1, label: "Đã liên kết" },
    { value: 2, label: "Lỗi liên kết" },
  ],
  enableSingleDateFilter,
  singleDateLabel,
  enablePageSize,
  availableDepartments = [],
  availableRoles = [],
  availableStatuses = [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngưng hoạt động" },
  ],
  availableCategories = [],
  availableBrands = [],
  defaultPageSize = 10,
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  children,
  onFilterChange,
  loading = false,
  initialFilters,
  filterClassNames = {},
  buttonClassNames = {},
  getExportData,
  canExport = true,
  onResetFilter,
  preventEmptyFilterCall = true,
  onDepartmentChange,
}: PaginatedTableProps) {
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastFiltersRef = useRef<string>("");
  const previousTotalRef = useRef<number>(0);

  const departmentOptions = useMemo(() => {
    if (!availableDepartments || availableDepartments.length === 0) {
      return [];
    }

    const firstItem = availableDepartments[0];

    // ✅ SỬA: Kiểm tra type trước khi truy cập property
    if (
      typeof firstItem === "object" &&
      firstItem !== null &&
      "value" in firstItem &&
      "label" in firstItem
    ) {
      // Nếu là array of objects {value, label}
      return (
        availableDepartments as Array<{ value: number; label: string }>
      ).map((d) => ({
        label: d.label,
        value: d.value.toString(),
      }));
    } else {
      // Nếu là array of strings
      return (availableDepartments as string[]).map((d) => ({
        label: d,
        value: d,
      }));
    }
  }, [availableDepartments]);

  const roleOptions = useMemo(
    () => availableRoles.map((r) => ({ label: r, value: r })),
    [availableRoles]
  );
  const statusOptions = useMemo(() => {
    if (!availableStatuses || availableStatuses.length === 0) {
      return [];
    }

    return availableStatuses.map((s) => {
      let label: string;
      let value: string;

      if (typeof s === "string") {
        value = s;
        // Map đúng label cho string values
        if (s === "draft") label = "Bản nháp";
        else if (s === "scheduled") label = "Đã lên lịch";
        else if (s === "running") label = "Đang chạy";
        else if (s === "paused") label = "Tạm dừng";
        else if (s === "completed") label = "Hoàn thành";
        else if (s === "archived") label = "Đã lưu trữ";
        else if (s === "paid") label = "Đã thanh toán";
        else if (s === "pay_later") label = "Đã hẹn thanh toán";
        else if (s === "no_information_available") label = "Không có thông tin";
        else if (s === "active") label = "Đang hoạt động";
        else if (s === "inactive") label = "Ngưng hoạt động";
        else label = s; // Fallback
      } else if (
        typeof s === "object" &&
        s !== null &&
        "value" in s &&
        "label" in s
      ) {
        // ✅ SỬA: Type assertion cho object case
        const statusObj = s as { value: string; label: string };
        value = statusObj.value;
        label = statusObj.label;
      } else {
        // Fallback case
        value = String(s);
        label = String(s);
      }

      return { label, value };
    });
  }, [availableStatuses]);

  const categoryOptions = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) {
      return [];
    }

    return availableCategories.map((c) => {
      if (typeof c === "string") {
        return { label: c, value: c };
      } else if (
        typeof c === "object" &&
        c !== null &&
        "value" in c &&
        "label" in c
      ) {
        // ✅ SỬA: Type assertion để tránh lỗi TypeScript
        const categoryObj = c as { value: string; label: string };
        return { label: categoryObj.label, value: categoryObj.value };
      } else {
        // Fallback case
        return { label: String(c), value: String(c) };
      }
    });
  }, [availableCategories]);

  const brandOptions = useMemo(
    () => availableBrands.map((b) => ({ label: b, value: b })),
    [availableBrands]
  );
  const employeeOptions = useMemo(
    () => availableEmployees.map((e) => ({ label: e.label, value: e.value })),
    [availableEmployees]
  );

  // Thêm useMemo cho zaloLinkStatusOptions
  const zaloLinkStatusOptions = useMemo(
    () =>
      availableZaloLinkStatuses.map((s) => ({
        label: s.label,
        value: s.value,
      })),
    [availableZaloLinkStatuses]
  );

  const [filters, setFilters] = useState<Filters>(() => ({
    search: initialFilters?.search || "",
    departments: initialFilters?.departments || [],
    roles: initialFilters?.roles || [],
    statuses: initialFilters?.statuses || [],
    zaloLinkStatuses: initialFilters?.zaloLinkStatuses || [],
    categories: initialFilters?.categories || [],
    brands: initialFilters?.brands || [],
    dateRange: initialFilters?.dateRange || { from: undefined, to: undefined },
    singleDate: initialFilters?.singleDate || undefined, // Không set mặc định
    employees: initialFilters?.employees || [],
  }));

  const isFiltersEmpty = useCallback((filters: Filters): boolean => {
    return (
      !filters.search.trim() &&
      filters.departments.length === 0 &&
      filters.roles.length === 0 &&
      filters.statuses.length === 0 &&
      (filters.zaloLinkStatuses?.length || 0) === 0 &&
      filters.categories.length === 0 &&
      filters.brands.length === 0 &&
      filters.employees.length === 0 &&
      !filters.dateRange.from &&
      !filters.dateRange.to &&
      !filters.singleDate
    );
  }, []);

  // Sync filters when initialFilters changes - but only if preserveFiltersOnEmpty is true
  const memoizedInitialFilters = useMemo(
    () => initialFilters,
    [
      initialFilters?.search,
      JSON.stringify(initialFilters?.departments),
      JSON.stringify(initialFilters?.roles),
      JSON.stringify(initialFilters?.statuses),
      JSON.stringify(initialFilters?.zaloLinkStatuses),
      JSON.stringify(initialFilters?.categories),
      JSON.stringify(initialFilters?.brands),
      JSON.stringify(initialFilters?.dateRange),
      initialFilters?.singleDate,
      JSON.stringify(initialFilters?.employees),
    ]
  );

  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    setHasUserInteracted(false);
  }, [memoizedInitialFilters]);

  useEffect(() => {
    setHasUserInteracted(false);
  }, [memoizedInitialFilters]);

  useEffect(() => {
    if (!isInitializedRef.current && initialFilters) {
      isInitializedRef.current = true;

      // ✅ Set initial filters without triggering change
      const merged = { ...filters, ...initialFilters };
      setFilters(merged);

      // ✅ Send initial filters to parent after a brief delay
      setTimeout(() => {
        if (
          onFilterChange &&
          (!preventEmptyFilterCall || !isFiltersEmpty(merged))
        ) {
          onFilterChange(merged);
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (memoizedInitialFilters && !hasUserInteracted) {
      setFilters((prev) => {
        const newFilters = {
          search:
            memoizedInitialFilters.search !== undefined
              ? memoizedInitialFilters.search
              : prev.search,
          departments:
            memoizedInitialFilters.departments !== undefined
              ? memoizedInitialFilters.departments
              : prev.departments,
          roles:
            memoizedInitialFilters.roles !== undefined
              ? memoizedInitialFilters.roles
              : prev.roles,
          statuses:
            memoizedInitialFilters.statuses !== undefined
              ? memoizedInitialFilters.statuses
              : prev.statuses,
          zaloLinkStatuses:
            memoizedInitialFilters.zaloLinkStatuses !== undefined
              ? memoizedInitialFilters.zaloLinkStatuses
              : prev.zaloLinkStatuses,
          categories:
            memoizedInitialFilters.categories !== undefined
              ? memoizedInitialFilters.categories
              : prev.categories,
          brands:
            memoizedInitialFilters.brands !== undefined
              ? memoizedInitialFilters.brands
              : prev.brands,
          dateRange:
            memoizedInitialFilters.dateRange !== undefined
              ? memoizedInitialFilters.dateRange
              : prev.dateRange,
          singleDate:
            memoizedInitialFilters.singleDate !== undefined
              ? memoizedInitialFilters.singleDate
              : prev.singleDate,
          employees:
            memoizedInitialFilters.employees !== undefined
              ? memoizedInitialFilters.employees
              : prev.employees,
        };

        // Only update if actually different
        const isEqual = JSON.stringify(prev) === JSON.stringify(newFilters);
        return isEqual ? prev : newFilters;
      });
    }
  }, [memoizedInitialFilters, hasUserInteracted]);

  // Xác định chế độ phân trang: backend (có page, pageSize, total) hay frontend (không có)
  const isBackendPaging =
    page !== undefined && pageSize !== undefined && total !== undefined;

  // State cho frontend pagination
  const [internalPage, setInternalPage] = useState(0); // 0-based
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  // Tính toán page/pageSize hiện tại
  const currentPage = isBackendPaging ? page! : internalPage + 1; // 1-based
  const currentPageSize = isBackendPaging ? pageSize! : internalPageSize;
  const totalRows = isBackendPaging
    ? total!
    : children && Array.isArray(children)
    ? children.length
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));

  // State tạm cho input pageSize (chỉ áp dụng cho input nhập số dòng/trang)
  const [pendingPageSize, setPendingPageSize] = useState<number | "">(
    currentPageSize
  );
  useEffect(() => {
    setPendingPageSize(currentPageSize);
  }, [currentPageSize]);

  // Debounce filter cho backend: giảm thời gian xuống 150ms để responsive hơn
  const filterTimeout = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetFilters = useCallback(
    (newFilters: Filters) => {
      if (filterTimeout.current) clearTimeout(filterTimeout.current);
      filterTimeout.current = setTimeout(() => {
        if (preventEmptyFilterCall && isFiltersEmpty(newFilters)) {
          // Nếu filter trống, reset filter
          handleResetFilter();
          return;
        }
        if (onFilterChange) {
          onFilterChange(newFilters);
        }
      }, 150);
    },
    [onFilterChange, preventEmptyFilterCall, isFiltersEmpty]
  );

  const handleResetFilter = useCallback(() => {
    const reset: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      zaloLinkStatuses: [],
      categories: [],
      brands: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: [],
    };

    setFilters(reset);
    setHasUserInteracted(false); // ✅ THÊM: Reset user interaction flag

    // ✅ THÊM: Reset department selection trong parent component
    if (onDepartmentChange) {
      onDepartmentChange([]);
    }

    if (onFilterChange) {
      onFilterChange(reset);
    }

    if (onPageChange) onPageChange(1);
    else setInternalPage(0);

    setPendingPageSize("");

    // Gọi callback reset filter ở trang cha nếu có
    if (typeof onResetFilter === "function") {
      onResetFilter();
    }
  }, [onPageChange, onResetFilter, onFilterChange, onDepartmentChange]);

  useEffect(() => {
    if (totalRows !== previousTotalRef.current) {
      previousTotalRef.current = totalRows;
    }
  }, [totalRows]);

  // updateFilter chỉ cập nhật filter, không reset page
  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setHasUserInteracted(true); // Mark that user has interacted
      setFilters((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        debouncedSetFilters(next);
        return next;
      });
    },
    [debouncedSetFilters]
  );

  // Memoized onChange handlers to prevent re-renders
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFilter("search", e.target.value);
    },
    [updateFilter]
  );

  const handleEmployeesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("employees", vals);
    },
    [updateFilter]
  );

  const handleDepartmentsChange = useCallback(
    (vals: (string | number)[]) => {
      let departments: (string | number)[];

      if (availableDepartments && availableDepartments.length > 0) {
        const firstItem = availableDepartments[0];

        // ✅ SỬA: Kiểm tra type đúng cách
        if (
          typeof firstItem === "object" &&
          firstItem !== null &&
          "value" in firstItem
        ) {
          // Nếu availableDepartments là array of objects
          const deptArray = availableDepartments as Array<{
            value: number;
            label: string;
          }>;
          departments = vals
            .map((v) => {
              const dept = deptArray.find(
                (d) => d.value.toString() === v.toString()
              );
              return dept ? dept.value : parseInt(v.toString(), 10);
            })
            .filter((v) => !isNaN(Number(v)));
        } else {
          // Nếu availableDepartments là array of strings
          departments = vals;
        }
      } else {
        departments = vals;
      }

      updateFilter("departments", departments);

      // Trigger department change callback
      if (onDepartmentChange) {
        onDepartmentChange(departments);
      }
    },
    [updateFilter, onDepartmentChange, availableDepartments]
  );

  const handleRolesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("roles", vals);
    },
    [updateFilter]
  );

  const handleStatusesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("statuses", vals);
    },
    [updateFilter]
  );

  const handleZaloLinkStatusesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("zaloLinkStatuses", vals);
    },
    [updateFilter]
  );

  const handleCategoriesChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("categories", vals);
    },
    [updateFilter]
  );

  const handleBrandsChange = useCallback(
    (vals: (string | number)[]) => {
      updateFilter("brands", vals);
    },
    [updateFilter]
  );

  // ...existing code...

  // State cho panel xuất CSV
  const [openExport, setOpenExport] = useState(false);

  // Đổi page size
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      if (isBackendPaging && onPageSizeChange) {
        onPageSizeChange(newSize);
      } else {
        setInternalPage(0);
        setInternalPageSize(newSize);
      }
    },
    [isBackendPaging, onPageSizeChange]
  );

  // Chuyển trang
  const goToPage = useCallback(
    (newPage: number) => {
      if (isBackendPaging && onPageChange) {
        onPageChange(newPage);
      } else {
        setInternalPage(newPage - 1);
      }
    },
    [isBackendPaging, onPageChange]
  );

  // Khi input số dòng/trang rỗng, tự động reset pageSize về mặc định
  useEffect(() => {
    if (pendingPageSize === "") {
      if (isBackendPaging && onPageSizeChange)
        onPageSizeChange(defaultPageSize);
      else setInternalPageSize(defaultPageSize);
      if (onPageChange) onPageChange(1);
      else setInternalPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPageSize]);

  return (
    <div className="flex flex-col h-full min-h-[500px] space-y-4 w-full">
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-3">
          {enableSearch && (
            <Input
              className={`min-w-0 w-full ${filterClassNames.search ?? ""}`}
              placeholder="Tìm kiếm..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          )}
          {enableEmployeeFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Nhân viên"
              value={filters.employees}
              options={employeeOptions}
              onChange={handleEmployeesChange}
            />
          )}
          {enableDepartmentFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.departments ?? ""}`}
              placeholder="Phòng ban"
              value={filters.departments.map(d => d.toString())}
              options={departmentOptions}
              onChange={handleDepartmentsChange}
            />
          )}
          {enableRoleFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.roles ?? ""}`}
              placeholder="Vai trò"
              value={filters.roles}
              options={roleOptions}
              onChange={handleRolesChange}
            />
          )}
          {enableStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.statuses ?? ""}`}
              placeholder="Trạng thái"
              value={filters.statuses}
              options={statusOptions}
              onChange={handleStatusesChange}
            />
          )}
          {enableZaloLinkStatusFilter && (
            <MultiSelectCombobox
              className={`min-w-0 w-full`}
              placeholder="Trạng thái liên kết"
              value={filters.zaloLinkStatuses!}
              options={zaloLinkStatusOptions}
              onChange={handleZaloLinkStatusesChange}
            />
          )}
          {enableCategoriesFilter && availableCategories.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.categories ?? ""}`}
              placeholder="Danh mục"
              value={filters.categories}
              options={categoryOptions}
              onChange={handleCategoriesChange}
            />
          )}
          {availableBrands.length > 0 && (
            <MultiSelectCombobox
              className={`min-w-0 w-full ${filterClassNames.brands ?? ""}`}
              placeholder="Brand"
              value={filters.brands}
              options={brandOptions}
              onChange={handleBrandsChange}
            />
          )}
          {enableSingleDateFilter && (
            <DatePicker
              value={
                filters.singleDate ? new Date(filters.singleDate) : undefined
              }
              onChange={(date) =>
                updateFilter(
                  "singleDate",
                  date ? date.toLocaleDateString("en-CA") : undefined
                )
              }
            />
          )}
          {/* Số dòng/trang nằm ngang hàng filter */}
          {enablePageSize && (
            <Input
              type="number"
              min={1}
              className="min-w-0 w-full border rounded px-2 py-1 text-sm"
              value={pendingPageSize}
              placeholder="Số dòng/trang"
              onChange={(e) => {
                const val = Number(e.target.value);
                setPendingPageSize(
                  e.target.value === "" ? "" : val > 0 ? val : ""
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = Number(pendingPageSize);
                  if (!isNaN(val) && val > 0) {
                    if (isBackendPaging && onPageSizeChange)
                      onPageSizeChange(val);
                    else {
                      setInternalPage(0);
                      setInternalPageSize(val);
                    }
                  }
                }
              }}
            />
          )}
          {/* Nút Xuất và Xoá filter chia đôi 1 cột */}
          <div className="flex gap-2 min-w-0 w-full">
            {canExport && getExportData && (
              <Button
                variant="export"
                className={`min-w-0 ${canExport ? "w-1/2" : "w-full"} ${
                  buttonClassNames.export ?? ""
                }`}
                onClick={() => setOpenExport(true)}
                disabled={!getExportData}
              >
                Xuất CSV
              </Button>
            )}
            <Button
              type="button"
              variant="delete"
              className={`min-w-0 ${
                canExport && getExportData ? "w-1/2" : "w-full"
              } ${buttonClassNames.reset ?? ""}`}
              onClick={handleResetFilter}
            >
              Xóa filter
            </Button>
          </div>
        </div>
        {/* Tổng số dòng dưới filter */}
        <div className="mt-4 ml-0.5 text font-medium">
          Tổng số dòng: <span className="text-red-500">{totalRows}</span>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: currentPageSize }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          // Khi backend paging, luôn render nguyên vẹn children (không slice/cắt)
          children
        )}
      </div>

      <div className="flex justify-center gap-2 pt-2 mt-2">
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.prev ?? ""}
          onClick={() => {
            goToPage(Math.max(currentPage - 1, 1));
          }}
          disabled={currentPage === 1}
        >
          Trước
        </Button>
        <span className="text-sm px-2 mt-1.5">
          Trang {currentPage} / {totalPages || 1}
        </span>
        <Button
          variant="gradient"
          size="sm"
          className={buttonClassNames.next ?? ""}
          onClick={() => {
            goToPage(Math.min(currentPage + 1, totalPages));
          }}
          disabled={currentPage >= totalPages}
        >
          Sau
        </Button>
      </div>

      {/* Panel xuất CSV */}
      {canExport && getExportData && (
        <CSVExportPanel
          open={openExport}
          onClose={() => setOpenExport(false)}
          defaultExportCount={currentPageSize}
          {...getExportData()}
        />
      )}
    </div>
  );
}
