// Highscores table beforeCreate event handler
function beforeCreate(items){
  "use strict";
  for (var i = 0; i < items.length; i++){
    items[i].CreatedAt = new Date();
  }
}

// Images table beforeCreate event handler
function beforeCreate(items){
  "use strict";
  for (var i = 0; i < items.length; i++){
    var img = items[i];
    img.LastModified = new Date();
    if (img.Image && !img.Thumbnail){
      var Canvas = require('canvas');
	  var Image = Canvas.Image;
      
      var buf = new Buffer(img.Image, 'base64');
      var data = new Image();
      data.src = buf;
      var canvas = new Canvas(200, 200);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(data, 0, 0, 200, 200);
      img.Thumbnail = canvas.toDataURL().split(',')[1];
      img.Width = data.width;
      img.Height = data.height;
      if (!img.Type) img.Type = 'image/png';
    }
  }
}

// Images table beforeUpdate event handler
function beforeUpdate(items){
  "use strict";
  for (var i = 0; i < items.length; i++){
    items[i].LastModified = new Date();
  }
}

// mydatabase service server side code
module.exports = exports = function(type){
  "use strict";
  var puzzle = type.extend('puzzle', {
    getImage: function(id){
      ///<returns type="boolean"/>
      ///<param name="id" type="id"/>
      var req = this.executionContext.request;
      var res = this.executionContext.response;
      return function(success, error){
        this.Images.single(function(it){ return it.Id == this.id; }, { id: id }, {
          success: function(img){
            if (Date.parse(req.headers['if-modified-since']).valueOf() < img.LastModified.valueOf()){
              res.statusCode = 304;
              res.setHeader('Last-Modified', img.LastModified);
              res.setHeader('Content-Type', img.Type);
              res.end();
            }else{
              var buffer = new Buffer(img.Image, 'base64');
              res.setHeader('Last-Modified', img.LastModified);
              res.setHeader('Content-Type', img.Type);
              res.setHeader('Content-Length', buffer.length);
              res.write(buffer);
              res.end();
            }
            
            success(true);
          },
          error: error
        });
      };
    },
    getThumbnail: function(id){
      ///<returns type="boolean"/>
      ///<param name="id" type="id"/>
      var req = this.executionContext.request;
      var res = this.executionContext.response;
      return function(success, error){
        this.Images.single(function(it){ return it.Id == this.id; }, { id: id }, {
          success: function(img){
            if (Date.parse(req.headers['if-modified-since']).valueOf() < img.LastModified.valueOf()){
              res.statusCode = 304;
              res.setHeader('Last-Modified', img.LastModified);
              res.setHeader('Content-Type', img.Type);
              res.end();
            }else{
              var buffer = new Buffer(img.Thumbnail, 'base64');
              res.setHeader('Last-Modified', img.LastModified);
              res.setHeader('Content-Type', img.Type);
              res.setHeader('Content-Length', buffer.length);
              res.write(buffer);
              res.end();
            }
            
            success(true);
          },
          error: error
        });
      };
    }
  });
  
  puzzle.annotateFromVSDoc();
  return puzzle;
};
