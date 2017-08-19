import _ from 'liteutils'
import EventEmitter from 'events'
import { getIdAttribute } from "./BookshelfFactoryDefinition"
import { RELATIONS, EXTENDS, VIRTUALS } from "./constants"

function ignorable(colDef, colName) {
  let cols = _.keys(colDef)

  colName = _.isString(colName)
    ? colName
    : ''

  // check for individual ignore-able conditions
  let related = _.intersection(RELATIONS, cols).length !== 0
  let extend  = _.intersection(EXTENDS, cols).length !== 0
  let virtual = _.includes(cols, VIRTUALS)
  let dashCol = colName.match(/^_/) !== null
  let ignore  = colDef.ignore === true

  return ignore || related || extend || dashCol || virtual
}

export default class BookshelfFactoryLibrary extends EventEmitter {
  constructor (factory, definition) {
    super()
    this.factory = factory
    this.def = definition.compiled || {}
    this.lib = {}
  }

  make () {
    _.forEach(this.def, (tableDef, tableName) => {
      let modelName = _.get(tableDef, '_model.name', tableName)
      _.set(tableDef, '_model.name', modelName)
      _.set(tableDef, '_relations', [])

      // extend bookshelf prototype
      let objProto = {
        tableName,
        tableDef,
        modelName,
        virtuals: {},
        defaults: {},
        lib: this
      }
      let objClass = {}

      _.forEach(tableDef, (colDef, colName) => {
        if (_.isObject(colDef.extendProto) || _.isFunction(colDef.extendProto)) {
          objProto[colName] = colDef.extendProto
        } else if (_.isObject(colDef.extendClass) || _.isFunction(colDef.extendClass)) {
          objClass[colName] = colDef.extendClass
        } else if (colDef.hasOne) {
          if (colDef.hidden !== true) tableDef._relations.push(colName)
          objProto[colName] = function () {
            return this.hasOne(this.lib[colDef.hasOne], colDef.foreignKey || null);
          }
        } else if (colDef.hasMany) {
          if (colDef.hidden !== true) tableDef._relations.push(colName)
          objProto[colName] = function () {
            return this.hasMany(this.lib[colDef.hasMany], colDef.foreignKey || null)
          }
        } else if (colDef.belongsTo) {
          if (colDef.hidden !== true) tableDef._relations.push(colName)
          objProto[colName] = function () {
            return this.belongsTo(this.lib[colDef.belongsTo], colDef.foreignKey || null)
          }
        } else if (colDef.belongsToMany) {
          if (colDef.hidden !== true) tableDef._relations.push(colName)
          objProto[colName] = function () {
            return this.belongsToMany(
              this.lib[colDef.belongsToMany],
              colDef.junction || null,
              colDef.foreignKey || null,
              colDef.otherKey || null
            )
          }
        } else if (colDef.morphTo) {
          let morphArgs = [ colDef.morphTo ]
          if (colDef.hidden !== true) tableDef._relations.push(colName)
          if (Array.isArray(colDef.columnNames)) morphArgs.push(colDef.columnNames)
          objProto[colName] = function() {
            _.forEach(col.targets, target => {
              morphArgs.push(this.lib[target])
            })
            return this.morphTo.apply(this, morphArgs)
          }
        } else if (colDef.virtuals) {
          objProto.virtuals[colName] = colDef.virtuals
        }

        if (colDef.defaultTo && !ignorable(colDef, colName)) {
          objProto.defaults[colName] = colDef.defaultTo
        }
      })

      // add custom functions and properties
      objProto.idAttribute = getIdAttribute(tableDef)
      // objProto.cloneResource   = methods.cloneResource
      // objProto.deleteResource  = methods.deleteResource
      // objProto.end             = methods.end
      // objProto.getRelations    = methods.getRelations
      // objProto.getResource     = methods.getResource
      // objProto.getResources    = methods.getResources
      objProto.schema = tableDef
      // objProto.href            = methods.href
      // objProto.limit           = methods.limit
      // objProto.offset          = methods.offset
      // objProto.order           = methods.order
      // objProto.paginate        = methods.paginate
      // objProto.print           = methods.print
      // objProto.reset           = methods.reset
      // objProto.saveResource    = methods.saveResource
      // objProto.search          = methods.search
      // objProto.transaction     = methods.transaction
      // objProto.view            = methods.view


      // add properties that will be reset on forge
      objClass._var = {}
      objClass.results = null

      // create the model in the global factory store
      this.lib[tableName] = this.factory.bookshelf.Model.extend(objProto, objClass)
    })

    // return the lib
    return this.lib
  }
}