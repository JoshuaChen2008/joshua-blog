export const typeLabels: Record<string, string> = {
  note: '笔记',
  snippet: '片段',
  draft: '草稿',
  idea: '想法',
  research: '研究',
  reference: '参考'
}


export const statusLabels: Record<string, string> = {
  'in-progress': '进行中',
  incomplete: '未完成',
  ready: '已整理',
  archived: '已归档'
}

export const statusColors: Record<string, string> = {
  'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  incomplete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'
}

export const statusDotColors: Record<string, string> = {
  'in-progress': 'bg-yellow-500',
  incomplete: 'bg-red-500',
  ready: 'bg-green-500',
  archived: 'bg-gray-400'
}

export const typeColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  snippet: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  idea: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  research: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  reference: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
}
export default { typeColors, statusDotColors, statusLabels, typeLabels, statusColors }
