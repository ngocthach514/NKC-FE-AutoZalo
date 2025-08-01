import { useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import {
  UserWithPermissions,
  Permission,
  Role,
} from "../types";

export interface DynamicPermissionCheck {
  departmentSlug?: string;
  action?: string;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireSpecificRole?: string;
  requireAnyRole?: string[];
}

export const useDynamicPermission = () => {
  const { user } = useContext(AuthContext);

  // Lấy tất cả permissions từ user
  const userPermissions = useMemo((): Permission[] => {
    if (!user?.permissions) return [];
    
    const uniqueMap = new Map<string, Permission>();
    user.permissions.forEach((permission) => {
      const key = `${permission.name}:${permission.action}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, permission);
      }
    });

    return Array.from(uniqueMap.values());
  }, [user?.permissions]);

  // Lấy tất cả roles của user
  const userRoles = useMemo(() => {
    return user?.roles?.map((role: Role) => role.name) || [];
  }, [user?.roles]);

  // Lấy tất cả departments của user
  const userDepartments = useMemo(() => {
    return user?.departments || [];
  }, [user?.departments]);

  // Kiểm tra admin
  const isAdmin = useMemo(() => {
    return userRoles.includes("admin");
  }, [userRoles]);

  // Kiểm tra manager (bất kỳ loại manager nào)
  const isManager = useMemo(() => {
    return userRoles.some(role => role === "manager" || role.startsWith("manager-"));
  }, [userRoles]);

  // Hàm kiểm tra permission động
  const checkDynamicPermission = (check: DynamicPermissionCheck): boolean => {
    if (!user) return false;

    // Admin có tất cả quyền
    if (isAdmin) return true;

    // Kiểm tra yêu cầu admin
    if (check.requireAdmin && !isAdmin) {
      return false;
    }

    // Kiểm tra yêu cầu manager
    if (check.requireManager && !isManager) {
      return false;
    }

    // Kiểm tra role cụ thể
    if (check.requireSpecificRole && !userRoles.includes(check.requireSpecificRole)) {
      return false;
    }

    // Kiểm tra một trong các role
    if (check.requireAnyRole && !check.requireAnyRole.some(role => userRoles.includes(role))) {
      return false;
    }

    // Kiểm tra department và action
    if (check.departmentSlug && check.action) {
      return userPermissions.some(
        permission => 
          permission.name === check.departmentSlug && 
          permission.action === check.action
      );
    }

    // Kiểm tra chỉ department (thuộc phòng ban)
    if (check.departmentSlug && !check.action) {
      return userDepartments.some(dept => dept.slug === check.departmentSlug) ||
             userRoles.some(role => role.endsWith(`-${check.departmentSlug}`));
    }

    return true;
  };

  // Kiểm tra nhiều permissions (OR logic)
  const checkAnyPermission = (checks: DynamicPermissionCheck[]): boolean => {
    return checks.some(check => checkDynamicPermission(check));
  };

  // Kiểm tra tất cả permissions (AND logic)
  const checkAllPermissions = (checks: DynamicPermissionCheck[]): boolean => {
    return checks.every(check => checkDynamicPermission(check));
  };

  // Helper functions cho việc kiểm tra thường dùng
  const canReadDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "read" });
  };

  const canCreateInDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "create" });
  };

  const canUpdateInDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "update" });
  };

  const canDeleteInDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "delete" });
  };

  const canImportInDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "import" });
  };

  const canExportInDepartment = (departmentSlug: string): boolean => {
    return checkDynamicPermission({ departmentSlug, action: "export" });
  };

  // Lấy danh sách department slugs mà user có thể truy cập
  const getAccessibleDepartments = (): string[] => {
    const departments = new Set<string>();
    
    // Từ departments trực tiếp
    userDepartments.forEach(dept => departments.add(dept.slug));
    
    // Từ roles
    userRoles.forEach(role => {
      const match = role.match(/^(manager|user)-(.+)$/);
      if (match) {
        departments.add(match[2]);
      }
    });

    return Array.from(departments);
  };

  // Lấy tất cả permissions theo department
  const getPermissionsByDepartment = (departmentSlug: string) => {
    const permissions = userPermissions.filter(p => p.name === departmentSlug);
    const actions = permissions.map(p => p.action);
    
    return {
      canRead: actions.includes("read"),
      canCreate: actions.includes("create"),
      canUpdate: actions.includes("update"),
      canDelete: actions.includes("delete"),
      canImport: actions.includes("import"),
      canExport: actions.includes("export"),
      isManager: userRoles.includes("manager") || userRoles.includes(`manager-${departmentSlug}`),
      isUser: userRoles.includes("user") || userRoles.includes(`user-${departmentSlug}`),
      actions
    };
  };

  return {
    user,
    userPermissions,
    userRoles,
    userDepartments,
    isAdmin,
    isManager,
    checkDynamicPermission,
    checkAnyPermission,
    checkAllPermissions,
    canReadDepartment,
    canCreateInDepartment,
    canUpdateInDepartment,
    canDeleteInDepartment,
    canImportInDepartment,
    canExportInDepartment,
    getAccessibleDepartments,
    getPermissionsByDepartment,
  };
};
