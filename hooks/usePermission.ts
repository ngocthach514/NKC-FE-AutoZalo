// hooks/usePermission.ts
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import {
  PermissionCheckParams,
  UserWithPermissions,
  Permission,
  Role,
} from "../types";

export const usePermission = () => {
  const { user } = useContext(AuthContext);

  // Helper function để lấy tất cả permissions từ roles (thông qua rolePermissions)
  const getUserPermissions = (user: UserWithPermissions): Permission[] => {
    if (!user?.permissions) return [];

    // Loại bỏ duplicate permissions dựa trên name + action
    const uniqueMap = new Map<string, Permission>();
    user.permissions.forEach((permission) => {
      const key = `${permission.name}:${permission.action}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, permission);
      }
    });

    return Array.from(uniqueMap.values());
  };

  const checkPermission = ({
    departmentSlug,
    action,
  }: PermissionCheckParams): boolean => {
    if (!user) return false;

    // Kiểm tra user có role admin không
    const isAdmin = user.roles?.some((role: Role) => role.name === "admin");

    if (isAdmin) return true;

    // Lấy tất cả roles của user
    const userRoles = user.roles?.map((role: Role) => role.name) || [];

    // Tạo role cần kiểm tra
    const requiredRoles = [
      `manager-${departmentSlug}`,
      `user-${departmentSlug}`,
    ];

    // Kiểm tra user có role phù hợp không
    const hasRole = userRoles.some((role: string) =>
      requiredRoles.includes(role)
    );

    // Lấy tất cả permissions từ roles
    const userPermissions = getUserPermissions(user);

    // Kiểm tra user có permission phù hợp không
    const hasPermission = userPermissions.some(
      (permission) =>
        permission.name === departmentSlug && permission.action === action
    );

    return hasPermission;
  };

  const canAccess = (departmentSlug: string, action: string): boolean => {
    const result = checkPermission({ departmentSlug, action });
    return result;
  };

  // Helper function để lấy tất cả permissions của user
  const getAllUserPermissions = (): Permission[] => {
    if (!user) return [];
    return getUserPermissions(user);
  };

  // Helper function để lấy tất cả roles của user
  const getAllUserRoles = () => {
    return user?.roles || [];
  };

  // Helper function để lấy tất cả departments của user
  const getAllUserDepartments = () => {
    return user?.departments || [];
  };

  return {
    user,
    canAccess,
    checkPermission,
    getAllUserPermissions,
    getAllUserRoles,
    getAllUserDepartments,
  };
};
