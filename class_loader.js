
const fs = require('fs').promises
const path = require('path')
// Closure for populating classMap. The inner function
// recursiveWalk, recursively walks a directory and 
// load classes to classMap dictionary. We return a 
// getter function to load a class. 
module.exports = async function(classPath) {
  const classMap = {}
  async function recursiveWalk(classPath) {
    const stat = await fs.stat(classPath)
    if (stat.isDirectory()) {
      const files = await fs.readdir(classPath)
        for (let i = 0; i < files.length; i++) {
          filePath = path.join('./', classPath, files[i])
          await recursiveWalk(filePath)
        }
    } else {
      o = require('./'+classPath)()
      if (o && o.name && o.class) {
        classMap[o.name] = o.class
      }
    }
  }
  await recursiveWalk(classPath)
  return function(className) {
    return classMap[className]
  }  
}
