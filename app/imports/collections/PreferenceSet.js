// Create Preference collection
import Event from './Event';
import Logger from 'imports/logger';
import _ from 'lodash';


const PreferenceSets = new Meteor.Collection("preferencesets", {
  transform: function(doc) {
    return new PreferenceSet(
      doc._id,
      doc.userId,
      doc.indices,
      doc.location,
      doc.hidden_categories
    );
  }
});

// Preference class constructor
export default class PreferenceSet {

  constructor(aId,
              aUserId,
              aIndices,
              aLocation,
              hidden_categories) {

    this._id = aId;
    // Make the ID for the current user if no userId is defined.
    if (!aUserId) {
      aUserId = Meteor.userId();
    }
    this._userId = aUserId;
    this._indices = aIndices;
    if (!this._indices) {
      this._indices = [];
    }
    this._location = aLocation;
    if (!hidden_categories) {
      hidden_categories = [];
    }
    this._hidden_categories = hidden_categories;

  };

  get id() {
    return this._id;
  };

  get user() {
    return this._userId;
  };

  get indices() {
    return this._indices;
  };

  get location() {
    return this._location;
  };

  get hidden_categories() {
    return this._hidden_categories;
  };

  set location(location) {
    this._location = location;
  };

  static getCollection() {
    return PreferenceSets;
  };

  save(callback) {
    if (!this.user) {
      throw new Meteor.Error("User is not defined!");
    }

    if (!this.indices) {
      this._indices = [];
    }

    var doc = {
      userId: this.user,
      indices: this.indices,
      location: this.location,
      hidden_categories: this.hidden_categories
    };

    // If the preference object already exists, modify it
    if (this.id) {
      PreferenceSets.update(this.id, {$set: _.omit(doc, '_id')}, callback);
      // Else create new
    } else {
      // Don't have to worry about location change here because PreferenceSets are only
      // created once per user, right after user creation. The location is initially null.
      var that = this;
      PreferenceSets.insert(doc, function(error, result) {
        that._id = result;
        if (callback != null) {
          callback.call(that, error, result);
        }
      });
    }
  };


  resetPreference(category) {
    for (var i = 0; i < this.indices.length; ++i) {
      if (this.indices[i].category == category) {
        this.indices[i].index = 0;
        this.indices[i].count = 0;
      }
    }
  };

  // Update the user's preference set for the given category
  updatePreference(category, value) {
    // If index already exists for this category, find it and update it
    // appropriately
    for (var i = 0; i < this._indices.length; i++) {
      if (this._indices[i].category == category) {
        this._indices[i].index =
          (this._indices[i].index * this._indices[i].count + value) /
          (this._indices[i].count + 1);
        this._indices[i].count += 1;

        return true;
      }
    }

    // Otherwise, create new index with the value
    var newIndex = {
      category: category,
      index: value,
      count: 1
    };
    this._indices.push(newIndex);

    return false;
  };

  // Get a matching score between the set of categories and the preference
  // set
  getMatchingScore(categories) {
    // Calculate top half of cosine similarity equation
    var top = 0;
    // Not super efficient
    var that = this;
    categories.forEach(function(category) {
      for (var i = 0; i < that._indices.length; i++) {
        if (that._indices[i].category == category) {
          if (that._indices[i].index > 0 || that._indices[i].count > 2) {
            top += that._indices[i].index * Math.log(that._indices[i].count);
          }
          break;
        }
      }
    });

    // Calculate preference set 2-norm
    var sum = 0;
    for (var i = 0; i < this._indices.length; i++) {
      sum += this._indices[i].index * this._indices[i].index;
    }
    var preference2Norm = Math.sqrt(sum);

    // Calculate event 2-norm (equivalent to sqrt of category length since
    // these are all just 1 values)
    var event2Norm = Math.sqrt(categories.length);

    // Return score
    return top / (preference2Norm * event2Norm);
  };

  setIndex(category, index) {
    for (var i = 0; i < this._indices.length; i++) {
      if (this._indices[i].category == category) {
        this._indices[i].index = index;
        return;
      }
    }

    // If not preexisting
    this._indices.push({
      category: category,
      index: index,
      count: 0
    });
  };
}

PreferenceSets.allow({
  insert: function(userId, doc) {
    return false;
  },
  update: function(userId, doc, fields, modifier) {
    return userId == doc.userId;
  },
  remove: function(userId, doc) {
    return false;
  },
  fetch: ["userId"]
});
