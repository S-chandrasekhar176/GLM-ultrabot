import sys

content = open('src/app/watchlist/page.tsx', 'r', encoding='utf-8').read()

# Add import statement
import_stmt = "import { useKronosHotlist, useNews } from '@/hooks/useApi';\n"
if 'useKronosHotlist' not in content:
    idx = content.find('import { Card,')
    content = content[:idx] + import_stmt + content[idx:]

# Remove HOT_STOCKS and NEWS_STOCKS mock data arrays
start_idx = content.find('const HOT_STOCKS: HotStock[] = [')
end_idx = content.find('const INITIAL_CUSTOM:', start_idx)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Update WatchlistPage hook calls
old_init = '''export default function WatchlistPage() {
  const [customStocks, setCustomStocks] = useState<CustomStock[]>(INITIAL_CUSTOM);'''

new_init = '''export default function WatchlistPage() {
  const { data: hotData } = useKronosHotlist();
  const { data: newsData } = useNews();

  const HOT_STOCKS: HotStock[] = (hotData as HotStock[]) || [];
  const NEWS_STOCKS: NewsStock[] = (newsData as NewsStock[]) || [];

  const [customStocks, setCustomStocks] = useState<CustomStock[]>(INITIAL_CUSTOM);'''

content = content.replace(old_init, new_init)

open('src/app/watchlist/page.tsx', 'w', encoding='utf-8').write(content)
print('Updated watchlist page successfully')
