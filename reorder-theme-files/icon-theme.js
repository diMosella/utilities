const fs = require('fs');
const path = require('path');

const sourceList = [];
const resourcesList = [];
const busyList = [];

const checkDone = (isResources = false) => {
  const isDone = busyList.every((busyDir) => busyDir.done === true);
  if (isDone) {
    console.log(`List ${isResources ? 'resources' : 'sources'} done, found`, isResources ? resourcesList.length : sourceList.length, 'items');
    if (!isResources) {
      traverseDir('/usr/share/icons/Papirus-Dark/', resourcesList, null, false, true);
      setTimeout(() => {
        checkDone(true)
      }, 1000);
    } else {
      sourceList.forEach((source) => {
        const resource = resourcesList.find((resource) => (source.file === resource.file &&
          source.size === resource.size && source.symbolic === resource.symbolic)
        );
        if (resource) {
          fs.copyFile(resource.path, source.path, (error) => {
            if (error) {
              console.error('Couldn\'t copy', source.file, error);
              process.exit(-1);
            }
            console.log(source.file, 'was found and copied');
          });
        } else {
          console.log('Resource for', source.file, 'not found');
        }
      });
    }
  }
};



const traverseDir = (dirPath, targetList, dirSize, isSymbolic = false, isResources = false) => {
  busyList.push({ path: dirPath, done: false });
  fs.readdir(dirPath, (error, items) => {
    if (error) {
      console.error('Couldn\'t read directory', error);
      process.exit(-1);
    }
    console.log('Found %i items at path \'%s\'', items.length, dirPath);
    items.forEach((item) => {
      const itemPath = path.join(dirPath, item);
      fs.lstat(itemPath, (error, stats) => {
        if (error) {
          console.error('Couldn\'t read stats', error);
          process.exit(-1);
        }
        if (stats.isDirectory()) {
          const sizeMatches = item.match(/^(\d{2,})/);
          const symbolicMatches = item.match(/^symbolic/);
          const size = sizeMatches ? parseInt(sizeMatches[1]) : null;
          const symbolic = !!symbolicMatches;
          if(isResources) {
            console.log('Res', item, dirSize ? dirSize : size, isSymbolic ? isSymbolic : symbolic);
          }
          traverseDir(itemPath, targetList, dirSize ? dirSize : size, isSymbolic ? isSymbolic : symbolic, isResources);
        } else if (path.extname(item) === '.svg' && (stats.isFile() || (isResources && stats.isSymbolicLink()))) {
          targetList.push({ file: item, size: dirSize, symbolic: isSymbolic, path: itemPath })
        }
      });
    });
    busyList.find((busyDir) => busyDir.path === dirPath).done = true;
  });
};

if (process.argv.length <= 2) {
    console.error('Usage: node %s path/to/directory', __filename);
    process.exit(-1);
}
 
const topLevelPath = process.argv[2];
if (!fs.existsSync(topLevelPath)){
  console.error('Provided string is not a filesystem item' , topLevelPath);
  process.exit(-1);
}

traverseDir(topLevelPath, sourceList);
setTimeout(() => {
  checkDone()
}, 1000);
 