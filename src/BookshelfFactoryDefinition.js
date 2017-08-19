import _ from './litedash'
import {
  RELATIONS,
  HAS_ONE,
  HAS_MANY,
  BELONGS_TO,
  BELONGS_TO_MANY,
  CONNECT_RELATION
} from './constants'

function getRelation (colDef) {
  return _.first(_.intersection(RELATIONS, _.keys(colDef)))
}

function getPrimarySchema (tableDef, idAttr) {
  return _.pickBy(tableDef[idAttr], (val, key) => {
    return _.includes([ 'type', 'size' ], key)
  })
}

export function getIdAttribute (tableDef) {
  let keys = _.reduce(tableDef, (primaryKeys, colDef, colName) => {
    if (colDef.primary === true) primaryKeys.push(colName)
    return primaryKeys
  }, [])

  return !keys.length
    ? null
    : keys.length === 1
      ? keys[0]
      : keys
}

export default class BookshelfFactoryDefinition {
  constructor (factory, definition) {
    this.factory = factory
    this.def = _.merge({}, definition)
    this._compiled = null
  }

  /*
   * compiles the definition
   */
  get compiled () {
    this._compiled = this._compiled || this.connectRelations()
      .graphRelations()
      .setForeignKeys()
      .def
    return this._compiled
  }

  /*
   * First do a pass through definition to find any connected relations and update them
   */
  connectRelations () {
    _.forEach(this.def, (tableDef, tableName) => {
      _.forEach(tableDef, (colDef, colName) => {
        let relationType = getRelation(colDef)
        let relatedTable = _.get(colDef, `["${relationType}"]`)
        let relatedCol = _.get(colDef, CONNECT_RELATION)
        let relatedColDef = _.get(this.def, `["${relatedTable}"]["${relatedCol}"]`)
        let connRelationType = _.first(_.intersection(RELATIONS, _.keys(relatedColDef)))

        if (connRelationType) {
          if (((relationType === HAS_ONE || relationType === HAS_MANY) && connRelationType === BELONGS_TO) ||
            (relationType === BELONGS_TO && (connRelationType === HAS_ONE || connRelationType === HAS_MANY)) ||
            (relationType === BELONGS_TO_MANY && connRelationType === BELONGS_TO_MANY)) {
            _.set(this.def, `["${relatedTable}"]["${relatedCol}"].${CONNECT_RELATION}`, colName)
          } else {
            this.factory.emit('factory.warn', {
              message: `Removing invalid connect relation "${tableName}.${colName}" => "${relatedTable}.${relatedCol}"`
            })
            delete this.def[tableName][colName][CONNECT_RELATION]
          }
        } else {
          delete this.def[tableName][colName][CONNECT_RELATION]
        }
      })
    })

    return this
  }

  /*
   * updates a relations graph
   */
  graphRelations () {
    _.forEach(this.def, (tableDef, tableName) => {
      let idAttr = getIdAttribute(tableDef)
      if (!idAttr) return true

      _.forEach(this.def, (colDef, colName) => {
        let relationType = getRelation(colDef)
        let relatedTable = _.get(colDef, `["${relationType}"]`)
        let relatedTableDef = _.get(this.def, `["${relatedTable}"]`)
        let relatedIdAttr = getIdAttribute(relatedTableDef)
        let connCol = _.get(colDef, CONNECT_RELATION)
        let connRelatedColDef = _.get(relatedTableDef, connCol)

        // if there is no related table, move on
        if (!relatedTableDef) return true

        // check for hasOne and hasMany
        if (relationType === HAS_ONE || relationType === HAS_MANY) {
          colDef.foreignKey = colDef.foreignKey || `fk_${tableName}_${colName}_${idAttr}`

          // add the foreign key if it was not specified
          if (!_.has(relatedTableDef, `["${colDef.foreignKey}"]`)) {
            relatedTableDef[colDef.foreignKey] = getPrimarySchema(tableDef, idAttr)

            if (colDef.nullable) relatedTableDef[colDef.foreignKey].nullable = true

            // transfer the default to to the foreign key if the relation is a hasMany since
            // a hasOne relation by definition only has 1 relation in the targetTable it would
            // not make sense to default this relation potentially creating > 1 relation to the
            // same source item
            if (colDef.defaultTo && relationType === HAS_MANY) {
              relatedTableDef[colDef.foreignKey].defaultTo = colDef.defaultTo
            }
          }
        } else if (relationType === BELONGS_TO) {
          colDef.foreignKey = connRelatedColDef
            ? connRelatedColDef.foreignKey || `fk_${relatedTable}_${connCol}_${relatedIdAttr}`
            : colDef.foreignKey || `fk_${relatedTable}_${colName}_${relatedIdAttr}`

          // verify that the current table has the foreign key defined on itself
          if (!_.has(tableDef, `["${colDef.foreignKey}"]`)) {
            tableDef[colDef.foreignKey] = getPrimarySchema(relatedTableDef, relatedIdAttr)
            
            if (colDef.nullable) tableDef[colDef.foreignKey].nullable = true
            if (colDef.defaultTo) tableDef[colDef.foreignKey].defaultTo = colDef.defaultTo
          }
        } else if (relationType === BELONGS_TO_MANY) {
          let junctionTables = [ tableName, relatedTable ].sort()

          // check for a connection
          if (connCol && relatedTableDef) {
            let masterColDef = tableName === _.first(junctionTables)
              ? colDef
              : this.def[colDef.belongsToMany][connCol]

            colDef.junction = colDef.junction || `jn_${masterColDef.connectRelation}_${junctionTables.join('_')}`
          }
          else {
            colDef.junction = colDef.junction || `jn_${colName}_${junctionTables.join('_')}`
          }

          // get or determine the foreign key and other key
          colDef.otherKey   = colDef.otherKey   || `${relatedTable}_${relatedIdAttr}`
          colDef.foreignKey = colDef.foreignKey || `${tableName}_${idAttr}`

          // check for the junction table, create it if it doesn't exist
          this.def[colDef.junction] = this.def[colDef.junction] || {}

          // check for foreign key, create if doesn't exist
          if (!_.has(this.def[colDef.junction], `["${colDef.foreignKey}"]`)) {
            this.def[colDef.junction][colDef.foreignKey] = getPrimarySchema(tableDef, idAttr);
          }

          // check for other key, create if doesn't exist
          if (!_.has(this.def[colDef.junction], `["${colDef.otherKey}"]`)) {
            schema[colSchema.junction][colSchema.otherKey] = getPrimarySchema(schema[relTableName][relIdAttr]);
          }
        }
      })
    })

    return this
  }

  /*
   * adds foreign keys. should be called after relations are updated
   */
  setForeignKeys() {
    _.forEach(this.def, (tableDef, tableName) => {
      _.forEach(tableDef, (colDef, colName) => {
        let relationType = getRelation(colDef)
        let relatedTable = _.get(colDef, relationType)
        let relatedTableDef = _.get(this.def, `["${relatedTable}"]`)

        if (relatedTableDef) {
          if (relationType === HAS_ONE || relationType === HAS_MANY) {
            relatedTableDef._foreignKeys = _.union(relatedTableDef._foreignKeys || [], [ colDef.foreignKey ])
          } else if (relationType === BELONGS_TO) {
            tableDef._foreignKeys = _.union(tableDef._foreignKeys || [], [ colDef.foreignKey ])
          }
        }
      })
    })

    return this
  }
}
