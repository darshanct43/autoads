import fs from 'fs';
import path from 'path';

const rootPath = process.cwd();

// Find all files and folders recursively (excluding node_modules, dist, .git, and some others)
function getFilesAndFolders(dir: string, fileList: string[] = [], folderList: string[] = []): { files: string[], folders: string[] } {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = path.relative(rootPath, fullPath);
    
    if (relPath.includes('node_modules') || relPath.includes('.git') || relPath.includes('dist') || relPath === 'package-lock.json') {
      continue;
    }
    
    if (item.isDirectory()) {
      folderList.push(relPath);
      getFilesAndFolders(fullPath, fileList, folderList);
    } else {
      fileList.push(relPath);
    }
  }
  return { files: fileList, folders: folderList };
}

const { files, folders } = getFilesAndFolders(rootPath);
files.sort();
folders.sort();

console.log('=== TOTAL FILES ===');
console.log(files.length);

console.log('=== TOTAL FOLDERS ===');
console.log(folders.length);

const targetSubfolders = [
  'api',
  'backend',
  'lib',
  'public',
  'docs',
  'src/services',
  'src/modules',
  'src/components/common',
  'src/components/support',
  'src/components/portals',
  'src/components/admin'
];

console.log('=== SUBFOLDER STATUS ===');
targetSubfolders.forEach(sf => {
  const sfPath = path.join(rootPath, sf);
  const exists = fs.existsSync(sfPath);
  let fileCount = 0;
  if (exists) {
    // Count files under this subfolder
    fileCount = files.filter(f => f.startsWith(sf + '/') || f === sf).length;
    console.log(`STATUS: ${sf} | EXISTS: true | FILE_COUNT: ${fileCount}`);
  } else {
    console.log(`STATUS: ${sf} | EXISTS: false | FILE_COUNT: 0`);
  }
});

// Build accurate directory tree
function buildTree(fileList: string[]): string {
  const tree: any = {};
  fileList.forEach(file => {
    const parts = file.split('/');
    let current = tree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      current = current[part];
    });
  });

  function renderTree(node: any, prefix = ''): string {
    let result = '';
    const keys = Object.keys(node).sort();
    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const child = node[key];
      const isDir = child !== null;
      const connector = isLast ? '└── ' : '├── ';
      result += `${prefix}${connector}${key}${isDir ? '/' : ''}\n`;
      if (isDir) {
        result += renderTree(child, prefix + (isLast ? '    ' : '│   '));
      }
    });
    return result;
  }

  return '.\n' + renderTree(tree);
}

const fileTree = buildTree(files);
fs.writeFileSync('/tmp_file_tree.txt', fileTree);
console.log('Tree written.');
