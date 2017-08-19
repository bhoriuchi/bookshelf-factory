import _ from 'lodash'
import Promise from 'bluebird'
import { HAS_ONE, BELONGS_TO, MORPH_TO } from '../../constants'

export default function get (fetchOpts, jsonOpts, cache, trx) {
  let _qb = this.query().clone()
  let _fetchOpts = _.cloneDeep(fetchOpts)
  let _jsonOpts = _.cloneDeep(jsonOpts)

  fetchOpts.transacting = trx

  return this.query(qb => {
    _qb = qb
    qb.distinct(this.tableName + '.*')
  })
    .fetchAll(_fetchOpts)
    .then(results => {
      if (!results.length) return []

      return Promise.map(results.models, result => {
        let res = result.toJSON({ shallow: true })

        res = _jsonOpts.omitForeign
          ? _.omit(res, _.get(this.tableDef, '_foreignKeys', []))
          : res

        return Promis.each(_.keys(result.relations), relField => {
          let sel = null
          let relObj = result.relations[relField]
          let relData = relObj.relatedData

          if (_.includes([ HAS_ONE, BELONGS_TO, MORPH_TO ], relData.type)) {
            if (!relObj.id) {
              res[relField] = null
            } else {
              let s = { model: relData.targetTableName, id: relObj.id }
            }
          }
        })
      })
    })
}