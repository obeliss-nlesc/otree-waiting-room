const fs = require('fs').promises
const path = require('path')

// Class for dynamically loading class plugins. 
// The inner function recursiveWalk, recursively 
// walks a directory and load classes to classMap 
// Map
class ClassLoader {
  constructor(classPath) {
    this.classMap = new Map()
    this.classPath = classPath
    this.#recursiveWalk(this.classPath)
  }

  async #recursiveWalk(dirPath) {
    const stat = await fs.stat(dirPath)
    if (stat.isDirectory()) {
      const files = await fs.readdir(dirPath)
        for (let i = 0; i < files.length; i++) {
          const filePath = path.join('./', dirPath, files[i])
          await this.#recursiveWalk(filePath)
        }
    } else {
      const o = require('./'+dirPath)()
      if (o && o.name && o.class) {
        this.classMap.set(o.name, o.class)
      }
    }
  }


  getClass(className) {
    return this.classMap.get(className)
  }

  classExists(className) {
    return this.classMap.has(className)
  }
}

module.exports = ClassLoader
