"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import DepartmentTable from "@/components/department/DepartmentTable";
import DepartmentCreateModal from "@/components/department/DepartmentCreateModal";
import EditDepartmentModal from "@/components/department/EditDepartmentModal";
import RestoreDepartmentModal from "@/components/department/RestoreDepartmentModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getAccessToken } from "@/lib/auth";
import { useApiState } from "@/hooks/useApiState";
import type { Department } from "@/types";
import { PDynamic } from "@/components/common/PDynamic";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

export default function DepartmentPage() {
  const { canReadDepartment, canCreateInDepartment, canExportInDepartment } = useDynamicPermission();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<number | null>(null);

  // Fetch function for departments
  const fetchDepartments = useCallback(async (): Promise<{ data: Department[]; total: number }> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }



    let query = `?page=${page}&limit=${pageSize}`;
    if (search) {
      query += `&search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch departments");
    }

    const result = await res.json();


    return {
      data: result.data || [],
      total: result.total || 0
    };
  }, [page, pageSize, search]);

  // Use the custom hook for departments
  const {
    data: departmentsData,
    isLoading,
    error,
    forceUpdate
  } = useApiState(fetchDepartments, { data: [], total: 0 });

  // Extract departments and total from data
  const departments = departmentsData.data;
  const total = departmentsData.total;

  // Refetch when page or search changes
  useEffect(() => {
    forceUpdate();
  }, [page, search, forceUpdate]);

  // Handle department operations
  const handleAddDepartment = async (departmentData: { name: string; description?: string }) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(departmentData),
      });

      if (!res.ok) throw new Error("Failed to add department");

      setAlert({ type: "success", message: "Thêm phòng ban thành công!" });
      setIsAddModalOpen(false);
      setPage(1);
      forceUpdate();
    } catch (err) {
      setAlert({ type: "error", message: "Thêm phòng ban thất bại!" });
    }
  };

  const handleEditDepartment = async (departmentData: Department) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments/${departmentData.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(departmentData),
      });

      if (!res.ok) throw new Error("Failed to update department");

      setAlert({ type: "success", message: "Cập nhật phòng ban thành công!" });
      setIsEditModalOpen(false);
      setEditingDepartment(null);
      forceUpdate();
    } catch (err) {
      setAlert({ type: "error", message: "Cập nhật phòng ban thất bại!" });
    }
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments/${departmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete department");

      setAlert({ type: "success", message: "Xóa phòng ban thành công!" });
      setIsDeleteDialogOpen(false);
      setDeletingDepartmentId(null);
      
      // If deleting the last item on current page, go to previous page
      if (departments.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        forceUpdate();
      }
    } catch (err) {
      setAlert({ type: "error", message: "Xóa phòng ban thất bại!" });
      setIsDeleteDialogOpen(false);
      setDeletingDepartmentId(null);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    setSearch(filters.search || "");
    setPage(1);
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: "Lỗi khi tải danh sách phòng ban!" });
    }
  }, [error]);

  // if (isLoading && departments.length === 0) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <LoadingSpinner size={32} />
  //       <span className="ml-2">Đang tải dữ liệu...</span>
  //     </div>
  //   );
  // }

  return (
    <PDynamic permissions={[{ departmentSlug: 'account', action: 'read' }]} fallback={
      <div className="p-6 text-center">
        <p className="text-gray-500">Bạn không có quyền truy cập trang này</p>
      </div>
    }>
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <span className="flex items-center gap-2">
              <span>Quản Lý Phòng Ban</span>
              {/* Department SVG icon: School Bag */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary" aria-label="Phòng Ban">
              <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="10" y="13" width="4" height="3" rx="1" fill="currentColor" />
              <path d="M4 12v2m16-2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <PDynamic permissions={[{ departmentSlug: 'account', action: 'read' }]}>
                <Button
                  onClick={() => setIsRestoreModalOpen(true)}
                  variant="gradient"
                  className="text-sm"
                >
                  Phòng ban đã xóa
                </Button>
              </PDynamic>
              <PDynamic permissions={[{ departmentSlug: 'account', action: 'create' }]}>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  variant="add"
                  className="text-sm"
                >
                  + Thêm Phòng Ban
                </Button>
              </PDynamic>
              <Button
                onClick={() => forceUpdate()}
                variant="outline"
                className="text-sm"
              >
                🔄 Làm mới
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <PaginatedTable
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            canExport={canExportInDepartment('account')}
            emptyText="Không có phòng ban nào."
            enableSearch
            onFilterChange={handleFilterChange}
          >
            <DepartmentTable
              departments={departments}
              onEdit={(department: Department) => {
                setEditingDepartment(department);
                setIsEditModalOpen(true);
              }}
              onDelete={(department: Department) => {
                setDeletingDepartmentId(department.id);
                setIsDeleteDialogOpen(true);
              }}
              startIndex={(page - 1) * pageSize}
              expectedRowCount={pageSize}
            />
          </PaginatedTable>
        </CardContent>

        {/* Add Department Modal */}
        {isAddModalOpen && (
          <DepartmentCreateModal
            open={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onCreated={() => {
              setAlert({ type: "success", message: "Thêm phòng ban thành công!" });
              setIsAddModalOpen(false);
              setPage(1);
              forceUpdate();
            }}
          />
        )}

        {/* Edit Department Modal */}
        {isEditModalOpen && editingDepartment && (
          <EditDepartmentModal
            open={isEditModalOpen}
            department={editingDepartment}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingDepartment(null);
            }}
            onUpdated={() => {
              setAlert({ type: "success", message: "Cập nhật phòng ban thành công!" });
              setIsEditModalOpen(false);
              setEditingDepartment(null);
              forceUpdate();
            }}
          />
        )}

        {/* Restore Department Modal */}
        {isRestoreModalOpen && (
          <RestoreDepartmentModal
            open={isRestoreModalOpen}
            onClose={() => setIsRestoreModalOpen(false)}
            onRestored={() => {
              setAlert({ type: "success", message: "Khôi phục phòng ban thành công!" });
              forceUpdate();
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa phòng ban này?"
          onConfirm={() => deletingDepartmentId && handleDeleteDepartment(deletingDepartmentId)}
          onCancel={() => {
            setIsDeleteDialogOpen(false);
            setDeletingDepartmentId(null);
          }}
        />
      </Card>
    </PDynamic>
  );
}
