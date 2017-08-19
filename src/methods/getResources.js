import { resolveInput } from "./internal/helpers"
import get from './get'

export default function getResources (fetchOpts = {}, jsonOpts = {}, cache = {}) {
  if (!this._var) {
    this.results = null
    this._var = {}
  }

  // determine json opts
  jsonOpts.omitPivot = jsonOpts.omitPivot !== false
  jsonOpts.omitForeign = jsonOpts.omitForeign !== false
  jsonOpts.omitHref = jsonOpts.omitHref === true

  // determine fetch opts
  fetchOpts._depth = _.has(fetchOpts, '_depth')
    ? fetchOpts._depth + 1
    : 0

  fetchOpts._circular = _.has(fetchOpts, '_circular')
    ? _.union(fetchOpts._circular, [ this.tableName ])
    : [ this.tableName ]

  fetchOpts.useCache = fetchOpts.useCache !== false
  cache = cache || {}

  this.results = resolveInput(null, this)
    .then(results => {
      fetchOpts.withRelated = fetchOpts.withRelated || this.tableDef._relations || null
      if (results.results instanceof Error) throw results.results

      let op = fetchOpts.transacting
        ? get.call(this, fetchOpts, jsonOpts, cache, fetchOpts.transacting)
        : this._var.transaction
          ? get.call(this, fetchOpts, jsonOpts, cache, this._var.transaction)
          : this.lib.factory.bookshelf.transaction(trx => {
            return get.call(this, fetchOpts, jsonOpts, cache, trx)
          })

      return op.then(results => results)
    }, error => {

    })

  this._prevMethod = 'getResources'
  return this
}