import type { PrerequisiteCheck, PrerequisiteCheckId } from '../../shared/ipc'
import { compareVersions } from '../ipc/utils'
import { PYTHON_PACKAGE_MAX_EXCLUSIVE } from './config'

export function checkVersion(
  id: PrerequisiteCheckId,
  installed: string | null,
  minimum?: readonly number[]
): PrerequisiteCheck {
  return {
    id,
    installed,
    status: installed && (!minimum || compareVersions(installed, minimum) >= 0) ? 'ok' : 'missing'
  }
}

export function isUnsupportedPythonForPackages(version: string | null): boolean {
  return Boolean(version && compareVersions(version, PYTHON_PACKAGE_MAX_EXCLUSIVE) >= 0)
}
