import sys

content = open('src/app/strategies/page.tsx', 'r', encoding='utf-8').read()

# Add import
import_statement = "import { useStrategies } from '@/hooks/useApi';\n"
if 'useStrategies' not in content:
    idx = content.find('import { Badge }')
    content = content[:idx] + import_statement + content[idx:]

# Remove ONLY MOCK_STRATEGIES array
start_idx = content.find('const MOCK_STRATEGIES: Strategy[] = [')
end_idx = content.find('];', start_idx) + 2

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Replace state logic
old_logic = '''  const [manualEnabled, setManualEnabled] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    MOCK_STRATEGIES.forEach((s) => { map[s.id] = s.active; });
    return map;
  });
  const [strategies, setStrategies] = useState<Strategy[]>(MOCK_STRATEGIES);'''

new_logic = '''  const { data: apiStrategies = [], toggle } = useStrategies();
  const strategies = (apiStrategies as Strategy[]) || [];
  
  const [manualEnabled, setManualEnabled] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const map: Record<string, boolean> = {};
    strategies.forEach((s) => { map[s.id] = s.active; });
    setManualEnabled(map);
  }, [strategies]);'''

content = content.replace(old_logic, new_logic)

# Replace handleToggle
old_toggle = '''  const handleToggle = (id: string, enabled: boolean) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: enabled, pauseReason: enabled ? undefined : 'manual_pause' as const } : s)),
    );
    setManualEnabled((prev) => ({ ...prev, [id]: enabled }));
  };'''

new_toggle = '''  const handleToggle = (id: string, enabled: boolean) => {
    toggle({ name: id, isEnabled: enabled });
  };'''

content = content.replace(old_toggle, new_toggle)

# Replace handleManualCheck
old_check = '''  const handleManualCheck = (id: string, checked: boolean) => {
    setManualEnabled((prev) => ({ ...prev, [id]: checked }));
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: checked, pauseReason: checked ? undefined : 'manual_pause' as const } : s)),
    );
  };'''

new_check = '''  const handleManualCheck = (id: string, checked: boolean) => {
    toggle({ name: id, isEnabled: checked });
  };'''

content = content.replace(old_check, new_check)

# Add useEffect import
old_import = "import { useState, useMemo } from 'react';"
new_import = "import { useState, useMemo, useEffect } from 'react';"
content = content.replace(old_import, new_import)

open('src/app/strategies/page.tsx', 'w', encoding='utf-8').write(content)
print('Updated strategies page successfully')
