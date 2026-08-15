import sys

content = open('src/app/errors/page.tsx', 'r', encoding='utf-8').read()

# Add import statement
import_stmt = "import { useErrors } from '@/hooks/useApi';\n"
if 'useErrors' not in content:
    idx = content.find('import { Card,')
    content = content[:idx] + import_stmt + content[idx:]

# Remove ACTIVE_ERRORS and ERROR_HISTORY arrays
start_idx = content.find('const ACTIVE_ERRORS: ActiveError[] = [')
end_idx = content.find('// ─────────────────────────────────────────────\n// Helper Configs & Styles', start_idx)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Update component hook
old_comp = '''export default function ErrorsPage() {
  const [activeErrors, setActiveErrors] = useState<ActiveError[]>(ACTIVE_ERRORS);'''

new_comp = '''export default function ErrorsPage() {
  const { data: apiErrors } = useErrors();
  const rawErrors = (apiErrors as any) || {};

  const activeErrors: ActiveError[] = Array.isArray(rawErrors.active) ? rawErrors.active : [];
  const ERROR_HISTORY: ErrorHistoryEntry[] = Array.isArray(rawErrors.history) ? rawErrors.history : [];
'''

content = content.replace(old_comp, new_comp)

open('src/app/errors/page.tsx', 'w', encoding='utf-8').write(content)
print('Updated errors page successfully')
