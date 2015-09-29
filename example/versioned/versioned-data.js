module.exports = {
        item: [
            { id: 1, name: "eggs"},
            { id: 2, name: "milk" },
            { id: 3, name: "cheese" },
            { id: 4, name: "diapers" },
            { id: 5, name: "oranges" },
            { id: 6, name: "apples" },
            { id: 7, name: "steak" },
            { id: 8, name: "chicken" },
            { id: 9, name: "potato chips" },
            { id: 10, name: "toothpaste" }
           
        ],
        list: [
            { id: 1, name: "shopping1", current_version: 2},
            { id: 2, name: "shopping2", current_version: 1}
        ],
        listver: [
            { id: 5, parent_id: 1, published: 0, version: 0, fk_category_category_id: 1},
            { id: 2, parent_id: 1, published: 1, version: 1, fk_category_category_id: 1, valid_from: "1435685769404", valid_to: "1438277769404" },
            { id: 3, parent_id: 1, published: 1, version: 2, fk_category_category_id: 1, valid_from: "1435685769404" },
            { id: 4, parent_id: 2, published: 1, version: 1, fk_category_category_id: 2, valid_from: "1435685769404" }
        ],
        jn_items_item_listver: [
            { listver_id: 2, item_id: 3 },
            { listver_id: 2, item_id: 4 },
            { listver_id: 2, item_id: 7 },
            { listver_id: 2, item_id: 9 },
            { listver_id: 3, item_id: 3 },
            { listver_id: 3, item_id: 4 },
            { listver_id: 3, item_id: 6 },
            { listver_id: 4, item_id: 1 }
        ],
        user: [
            {id: 1, name: "John Doe", fk_list_shared_with_id: 1, current_version: 1},
            {id: 2, name: "Jane Doe", fk_list_shared_with_id: 2, current_version: 1},
            {id: 3, name: "Foreal Doe", current_version: 1}
        ],
        userver: [
            {id: 1, parent_id: 1, published: 1, version: 1, list_id: 1, valid_from: "1438277769404" },
            {id: 2, parent_id: 2, published: 1, version: 1, list_id: 2, valid_from: "1438277769404" },
            {id: 3, parent_id: 1, published: 0, version: 0, list_id: 3},
            {id: 4, parent_id: 2, published: 0, version: 0, list_id: 2},
            {id: 5, parent_id: 3, published: 0, version: 0},
            {id: 6, parent_id: 3, published: 1, version: 1, list_id: 2, valid_from: "1438277769404" },
            

            
        ],
        category: [
            {id: 1, name: "Shopping"},
            {id: 2, name: "Christmas"}
        ],
        location: [
            {id: 1, name: 'Johns House', user_id: 1},
            {id: 2, name: 'Janes House', user_id: 2}
        ]
};