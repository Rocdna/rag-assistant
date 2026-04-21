/**
 * 登录注册表单校验工具
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 邮箱格式校验
 */
export function validateEmail(value: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!value) {
    return { valid: false, error: '邮箱不能为空' };
  }
  if (!emailRegex.test(value)) {
    return { valid: false, error: '请输入有效的邮箱格式' };
  }
  return { valid: true };
}

/**
 * 密码校验（登录）
 */
export function validatePassword(value: string): ValidationResult {
  if (!value) {
    return { valid: false, error: '密码不能为空' };
  }
  if (value.length < 6) {
    return { valid: false, error: '密码至少6位' };
  }
  return { valid: true };
}

/**
 * 确认密码校验（注册）
 */
export function validateConfirmPassword(value: string, password: string): ValidationResult {
  if (!value) {
    return { valid: false, error: '请再次输入密码' };
  }
  if (value !== password) {
    return { valid: false, error: '两次输入的密码不一致' };
  }
  return { valid: true };
}
