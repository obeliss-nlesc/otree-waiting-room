const fs = require("fs").promises
const path = require("path")

class HiddenObject {
  constructor(classMap) {
    this.classMap = classMap
  }
}

// Class for dynamically loading class plugins.
// The inner function recursiveWalk, recursively
// walks a directory and load classes to classMap
// Map
class ClassLoader {
  // Private property
  #classMap = null
  /*
   * @private constructor. Should not be
   * called outside
   */
  constructor(hiddenObject) {
    if (!(hiddenObject instanceof HiddenObject)) {
      throw new TypeError(
        "ClassLoader is not constructable. Use ClassLoader.initialize().",
      )
    }
    this.#classMap = hiddenObject.classMap
  }

  static async initialize(classPath) {
    const classMap = new Map()
    async function recursiveWalk(dirPath) {
      const stat = await fs.stat(dirPath)
      if (stat.isDirectory()) {
        const files = await fs.readdir(dirPath)
        for (let i = 0; i < files.length; i++) {
          const filePath = path.join("./", dirPath, files[i])
          await recursiveWalk(filePath)
        }
      } else {
        const o = require("./" + dirPath)()
        if (o && o.name && o.class) {
          classMap.set(o.name, o.class)
        }
      }
    }
    await recursiveWalk(classPath)
    return new ClassLoader(new HiddenObject(classMap))
  }

  getClass(className) {
    return this.#classMap.get(className)
  }

  classExists(className) {
    return this.#classMap.has(className)
  }
}

module.exports = ClassLoader
