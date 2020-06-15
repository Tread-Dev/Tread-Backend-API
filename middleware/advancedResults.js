const advancedResults = (model, populate) => async (req, res, next) => {
  //Creating query object in the correct format for lt,gt,lte,gte,in
  let query;

  //For Filtering - Copy req.query
  const reqQuery = { ...req.query };

  //Fields to exclude for select params, sort, page, limit
  const removeFields = ['select', 'sort', 'page', 'limit'];

  //Loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);
  console.log(reqQuery);

  //Create query string
  let queryStr = JSON.stringify(reqQuery);

  //Adding $ before the query obj to create operators ($gt,$gte,$lt,$lte,$in)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  console.log(queryStr);

  //Query for searching the DB - queryStr has to be parsed before passing
  query = model.find(JSON.parse(queryStr));

  //Select Fields (url?select=name,description)
  if (req.query.select) {
    //Converting name,description to 'name description' for mongo select format
    const fields = req.query.select.split(',').join(' ');
    console.log(fields);
    query = query.select(fields);
  }

  //Sorting (url?sort=-name,description)
  if (req.query.sort) {
    //Converting -name,description to '-name description' for mongo select format | - is for descending sort
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    //Default sort by date
    query = query.sort('-createdAt');
  }

  //Pagination and Limit
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 2;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments();

  query.skip(startIndex).limit(limit);

  //Populate data from other models
  if (populate) {
    query = query.populate(populate);
  }

  //Request sent to DB to search for the query
  const results = await query;

  //Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  //Create response obj which can be used within any routes using middleware
  res.advancedResults = {
    success: true,
    count: results.length,
    pagination: pagination,
    data: results,
  };

  next();
};

module.exports = advancedResults;
