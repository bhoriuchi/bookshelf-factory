module.exports = {
		survivor: [
            { sid: 1, name: "Hugo Reyes", station_id: 1, fk_actor_character_id: 2 },
            { sid: 2, name: "Sayid Jarrah", station_id: 2 },
            { sid: 3, name: "Jack Shephard", station_id: 1, fk_actor_character_id: 1 },
            { sid: 4, name: "James Ford", station_id: 3 },
            { sid: 5, name: "Jin Kwon", station_id: 4 },
            { sid: 6, name: "Sun Kwon", station_id: 5 },
            { sid: 7, name: "Kate Austen", station_id: 6 },
            { sid: 8, name: "John Locke", station_id: 7 },
            { sid: 9, name: "Claire Littleton", station_id: 8 },
            { sid: 10, name: "Ben Linus", station_id: 8 },
            { sid: 11, name: "Desmond Hume", station_id: 9 },
            { sid: 12, name: "Charlie Pace", station_id: 10 },
            { sid: 13, name: "Libby Smith", station_id: 10 },
            { sid: 14, name: "Anna Lucia Cortez", station_id: 10 }
        ],
        group: [
            { id: 1, name: "castaways"},
            { id: 2, name: "tailies" },
            { id: 3, name: "others" },
            { id: 4, name: "oceanic6" }
        ],
        jn_groups_group_survivor: [
            { survivor_sid: 1, group_id: 1 },
            { survivor_sid: 1, group_id: 4 },
            { survivor_sid: 2, group_id: 1 },
            { survivor_sid: 2, group_id: 4 },
            { survivor_sid: 3, group_id: 1 },
            { survivor_sid: 3, group_id: 4 },
            { survivor_sid: 4, group_id: 1 },
            { survivor_sid: 5, group_id: 1 },
            { survivor_sid: 6, group_id: 1 },
            { survivor_sid: 6, group_id: 4 },
            { survivor_sid: 7, group_id: 1 },
            { survivor_sid: 7, group_id: 4 },
            { survivor_sid: 8, group_id: 1 },
            { survivor_sid: 9, group_id: 1 },
            { survivor_sid: 10, group_id: 3 },
            { survivor_sid: 12, group_id: 1 },
            { survivor_sid: 13, group_id: 1 },
            { survivor_sid: 13, group_id: 2 },
            { survivor_sid: 14, group_id: 1 },
            { survivor_sid: 14, group_id: 2 }
        ],
        station: [
            { id: 1, name: "Flame", fk_group_station_id: 1 },
            { id: 2, name: "Arrow", fk_group_station_id: 2 },
            { id: 3, name: "Pearl", fk_group_station_id: 3 },
            { id: 4, name: "Swan", fk_group_station_id: 4 },
            { id: 5, name: "Hydra" },
            { id: 6, name: "Orchid" },
            { id: 7, name: "Staff" },
            { id: 8, name: "Looking Glass" },
            { id: 9, name: "Tempest" },
            { id: 10, name: "Lamp Post" }
        ],
        actor: [
            { id: 1, name: 'Matthew Fox'},
            { id: 2, name: 'Jorge Garcia' },
            { id: 3, name: 'Evangeline Lily'}
        ],
        nickname: [
            { id: 1, name: "Lardo", fk_actor_nicknames_id: 2 },
            { id: 2, name: "Pork Pie", fk_actor_nicknames_id: 2},
            { id: 3, name: "Hoss", fk_actor_nicknames_id: 2},
            { id: 4, name: "Rerun", fk_actor_nicknames_id: 2},
            { id: 5, name: "Hammo", fk_actor_nicknames_id: 2},
            { id: 6, name: "Snuffy", fk_actor_nicknames_id: 2},
            { id: 7, name: "Montezuma", fk_actor_nicknames_id: 2},
            { id: 8, name: "Freckles", fk_actor_nicknames_id: 3},
            { id: 9, name: "Sheena", fk_actor_nicknames_id: 3},
            { id: 10, name: "Thelma", fk_actor_nicknames_id: 3},
            { id: 11, name: "Shortcake", fk_actor_nicknames_id: 3},
            { id: 12, name: "Sweetcheeks", fk_actor_nicknames_id: 3},
            { id: 13, name: "Puddin", fk_actor_nicknames_id: 3}
        ]
};