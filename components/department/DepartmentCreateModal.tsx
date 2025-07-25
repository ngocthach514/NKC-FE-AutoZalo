import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth"; // Đảm bảo bạn có hàm này, hoặc sửa lại cho đúng dự án của bạn
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function DepartmentCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [serverIp, setServerIp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [deletedDepartment, setDeletedDepartment] = useState<any>(null);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  useEffect(() => {
    setNewSlug(slugify(newName));
    setError(null);
  }, [newName]);

  const handleCreate = async () => {
    setShowConfirm(false);
    if (!newName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ 
            name: newName,
            server_ip: serverIp 
          }),
        }
      );
      if (res.ok) {
        setNewName("");
        setNewSlug("");
        setServerIp("");
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        // Kiểm tra nếu trùng với phòng ban đã xóa
        if (data.code === 'DEPARTMENT_EXISTS_DELETED') {
          setDeletedDepartment(data.deletedDepartment);
          setShowRestoreConfirm(true);
        } else {
          setError(data.message || "Tạo phòng ban thất bại!");
        }
      }
    } catch {
      setError("Tạo phòng ban thất bại!");
    }
    setIsSubmitting(false);
  };

  const handleRestore = async () => {
    if (!deletedDepartment) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${deletedDepartment.id}/restore`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        setNewName("");
        setNewSlug("");
        setServerIp("");
        setShowRestoreConfirm(false);
        setDeletedDepartment(null);
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Khôi phục phòng ban thất bại!");
      }
    } catch {
      setError("Khôi phục phòng ban thất bại!");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo phòng ban mới</DialogTitle>
          <DialogDescription>
            Nhập tên phòng ban, slug sẽ tự sinh. Khi tạo sẽ tự sinh các quyền
            cho phòng ban này.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên phòng ban
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên phòng ban"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <Input value={newSlug} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              IP Server (tùy chọn)
            </label>
            <Input
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="Nhập IP server (vd: 192.168.117.xxx)"
            />
          </div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="gradient"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting || !newName.trim()}
          >
            {isSubmitting ? <LoadingSpinner size={18} /> : "Tạo"}
          </Button>
        </div>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận tạo phòng ban"
          message={`Bạn có chắc chắn muốn tạo phòng ban mới với tên "${newName}"${serverIp ? ` và IP server "${serverIp}"` : ''}?`}
          onConfirm={handleCreate}
          onCancel={() => setShowConfirm(false)}
        />
        {showRestoreConfirm && deletedDepartment && (
          <ConfirmDialog
            isOpen={showRestoreConfirm}
            onCancel={() => setShowRestoreConfirm(false)}
            onConfirm={handleRestore}
            confirmText="Khôi phục"
            cancelText="Hủy"
            title="Khôi phục phòng ban đã xóa"
            message={`Đã tồn tại phòng ban "${deletedDepartment.name}" bị xóa. Bạn có muốn khôi phục phòng ban này không?

• Tên: ${deletedDepartment.name}
• Slug: ${deletedDepartment.slug}${deletedDepartment.server_ip ? '\n• IP Server: ' + deletedDepartment.server_ip : ''}
• Ngày xóa: ${new Date(deletedDepartment.deletedAt).toLocaleDateString('vi-VN')}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
