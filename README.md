# ShowPal

Capstone project for April 2025 software development cohort

# UserRoutes

Register a new account:
/signup

Log in to an existing account:
/login

Verify that the token in local storage is valid on the front end (could be replaced with middleware for validating session, but just needed a basic private route to determine state):
/verify

# ShowRoutes

Shows (https://developer.themoviedb.org/reference/discover-tv)

(all .get routes)

Get array of objects representing TV Shows with keys for Title, Image, Release Date/Year, Seasons, Episode count, Genre, etc.:
NOTE: getting all the objects in the database would be excessive, so a /getall is proably unneeded. Listed below are routes filtering by what we will likely need for the MVP

Get highest rated or most viewed shows (this will be used on the home page and the default TV Shows tab before using any sort by filters):
/mostpopular

Filters for use on the TV Shows tab should be a stretch goal, but if it's gotten to, we can make criteria with several query params:
/:genre
/:byfirstcharacter
/:newest

Actually essential is a get route for getting specific shows, probably by ID, depending on what the data from TMDB looks like.
This will be necessary for the Shows.jsx page, which will dynamically render information based on the information fetched by this route. Additionally, the Lists on the website will essentially just be arrays of shows ID numbers, so displaying a list will require using a map method for each ID in the array, for which information will be displayed using this get route:
/:id

NOTE: before going any further, we will need to build out models with mongoose for the various types of data we will be creating and storing. Should include things like the ID of the show it relates to, the ID of the Review it's in response to, who the author is, a score on a scale of 1 to 10.

TODO:
List model
Review model
Comment model

# ListRoutes

Get methods for lists based on criteria like author, genre, or keywords:

# ReviewRoutes

Get methods for reviews based on criteria like author and what show it relates to (ID)

# CommentRoutes

Comments in this context are the same thing as replies in the reviews section, differing from the Review model in that they relate to a review or comment ID number instead of a show ID number

/:id

# AuthRoutes

To be built out further later. This section will include all the things that users should be able to do when they are logged in (authenticated, hence the name): i.e. CRUD methods for their own reviews, CRUD methods for their own lists, following and unfollowing other users
