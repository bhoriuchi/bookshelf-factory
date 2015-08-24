# Notes
---

* Update transform property to more specific onSave, onUpdate, onGet
* create a protected option that does not allow the user to change a field value.
this will be useful for the publish option or any operations where a function
should be run instead of inputting or transforming the data
* fix view to work with deep models
* rework save and delete to work with deep model saves


* prepareSchema updates
  * to support multiple relations to the same table, the name of the foreignkey should include the field name
  * a connectRelation field should be added to tell a relation that it is related to another and the following should be true
    * a belongsTo relation can be connected to as hasMany or hasOne relation and vice-versa
      * the field names will contain the relation name from the has relation
    * a belongsToMany relation can be connected to another belongsToMany relation
      * the name of the junction table should contain the relation field name from the first table when sorting table names