import _ from './litedash'
import EventEmitter from 'events'
import BookshelfFactoryDefinition from './BookshelfFactoryDefinition'
import BookshelfFactoryLibrary from './BookshelfFactoryLibrary'

class BookshelfFactory extends EventEmitter {
  constructor (bookshelf, options) {
    super()
    this.options = options
    this.bookshelf = bookshelf
    this.knex = bookshelf.knex
    this.bookshelf.plugin('virtuals')
  }

  transaction (chain) {
    return this.bookshelf.transaction(function (t) {
      let result = chain(t)
      return _.isFunction(result.then) && _.isFunction(result.catch)
        ? result
        : result.end()
    })
  }

  make (definitions, options = {}) {
    if (!_.isHash(definitions)) throw new Error('invalid definitions object')
    let def = new BookshelfFactoryDefinition(this, definitions)
    let lib = new BookshelfFactoryLibrary(this, def)
    return lib.make()
  }
}

function Factory (bookshelf, options) {
  return new BookshelfFactory(bookshelf, options)
}

Factory.BookshelfFactory = BookshelfFactory

export default Factory