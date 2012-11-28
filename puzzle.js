$(function(){
    window.onerror = function(err){
        alert(typeof err == 'object' ? JSON.stringify(err) : err);
    };
    
    ko.bindingHandlers.file = {
        init: function(element, valueAccessor){
            element.addEventListener('change', function(){
                var file = this.files[0];
                if (ko.isObservable(valueAccessor())){
                    valueAccessor()(file);
                }
            });
        }
    };
    
    function SlidingPuzzle(){
        var self = this;
        var tileMap, timer;
        var empty = [];
        
        var shuffle = function(o){
            for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x){};
            return o;
        };
        
        var arrayBufferToBase64 = function(buffer){
            var binary = ''
            var bytes = new Uint8Array(buffer);
            for (var i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        
        var checkWin = function(){
            for (var i = 0; i < tileMap.length; i++){
                for (var j = 0; j < tileMap[i].length; j++){
                    if ((i != (tileMap.length - 1) && j != (tileMap[i].length - 1) && tileMap[i][j] !== ((j + 1) + 'x' + (i + 1))) ||
                        (i == (tileMap.length - 1) && j == (tileMap[i].length - 1) && tileMap[tileMap.length - 1][tileMap[i].length - 1] !== null)) return false;
                }
            }

            return true;
        }
        
        var apiKey = {
            ownerId: '1199df77-c68b-4f52-8106-fa62d9542880',
            appId: '62f4bc12-6736-4681-844b-67d9662605c5',
            serviceName: 'mydatabase'
        };
        
        self.serviceFactory = ko.observable();

        self.mainMenu = ko.observableArray([
            { name: 'new-game', title: 'New game' },
            { name: 'image-gallery', title: 'Image gallery' },
            { name: 'how-to-play', title: 'How to play' },
            { name: 'leaderboards', title: 'Leaderboards' }
        ]);

        self.gameMenu = ko.observableArray([
            { name: 'easy-game', title: 'Easy', size: 3, description: 'A field of 3x3 tiles. Easy as pie!' },
            { name: 'normal-game', title: 'Normal', size: 4, description: '4x4 tiles for you to play. Still not a challenge.' },
            { name: 'hard-game', title: 'Hard', size: 5, description: 'Tiles in 5x5. I\'t getting interesting...' },
            { name: 'veryhard-game', title: 'Very hard', size: 7, description: '7x7. Now beat this fast as you can!' },
            { name: 'nightmare-game', title: 'Nightmare', size: 9, description: 'Your worst puzzle nightmare! 9x9 tiles.' }
        ]);

        self.images = ko.observableArray();
        self.imagesCount = ko.observable(0);
        self.highscores = ko.observableArray();
        self.highscoresCount = ko.observable(0);
        
        self.error = ko.observable(false);
        self.mask = ko.observable(false);
        self.paused = ko.observable(false);
        self.winner = ko.observable(false);
        self.prompt = ko.observable();
        
        self.uploadFile = ko.observable();
        self.uploadFileData = ko.observable();
        self.uploadFileType = ko.observable();
        self.uploadFile.subscribe(function(value){
            self.uploadFileType(value.type);
            var reader = new FileReader();
            reader.onload = function(e){
                self.uploadFileData(arrayBufferToBase64(e.target.result));
            };
            reader.readAsArrayBuffer(value);
        });

        self.changePage = function(item){
            self.currentPage(item.name);
        };

        self.backToMenu = function(){
            self.currentPage('main-menu');
        };

        self.imageGallery = function(){
            self.currentPage('image-gallery');
        };

        self.imageUpload = function(){
            self.currentPage('image-upload');
        };
        
        self.chooseFile = function(){
            document.getElementById('upload-file').click();
        };
        
        self.saveFile = function(){
            self.mask(true);
            $data.initService(apiKey).then(function(mydatabase, factory, type){
                self.serviceFactory(factory);
                self.error(false);

                mydatabase.Images.add({ Image: self.uploadFileData(), Type: self.uploadFileType() });
                mydatabase.saveChanges(function(cnt){
                    self.mask(false);
                    self.imageGallery();
                }).fail(function(err){
                    self.mask(false);
                    self.error(true);
                });
            }).fail(function(err){
                self.mask(false);
                self.error(true);
            });
        };

        self.typeGame = function(item){
            self.playerDifficulty(item.size);
            if (!self.playerImage() || self.winner()) self.currentPage('type-game');
            else self.newGame();
        };
        
        self.randomImage = function(){
            self.mask(true);
            $data.initService(apiKey).then(function(mydatabase, factory, type){
                self.serviceFactory(factory);
                self.error(false);

                mydatabase.Images.filter(function(it){
                    return !it.Banned;
                }).length(function(cnt){
                    mydatabase.Images.map(function(it){
                        return it.Id;
                    }).skip(Math.floor(Math.random() * cnt)).take(1).forEach(function(it){
                        self.mask(false);
                        self.playerImage(self.getImageURL(it, mydatabase));
                        self.newGame();
                    });
                });
            }).fail(function(err){
                self.mask(false);
                self.error(true);
            });
        };

        self.newGame = function(){
            self.winner(false);
            
            if (!self.playerImage()){
                self.playerImage(document.querySelector('.gallery-image-container.active img').getAttribute('data-image'));
            }
            
            if (!self.playerDifficulty()){
                self.currentPage('new-game');
                return;
            }
            
            var src = self.playerImage().replace(/'/ig, "\\'");
            var pre = new Image();
            pre.onload = function(){
                self.mask(false);
                var siz = 450;
                var dif = self.playerDifficulty();
                var til = Math.floor(siz / dif);
                var style = '';
                style += '#puzzle .image{ background-image: url(wood.png), url(' + "'" + src + "'" + '); }\n';
                style += '#puzzle .block{ background-image: url(wood.png), url(' + "'" + src + "'" + '); }\n';
                style += '#puzzle .block{ width: ' + (til - 2) + 'px; height: ' + (til - 2) + 'px; }\n';
                for (var i = 1; i <= dif; i++){
                    for (var j = 1; j <= dif; j++){
                        style += '#puzzle .block.tile' + j + 'x' + i + '{ background-position: ' + (j == 1 ? 0 : -(j - 1) * til) + 'px ' + (i == 1 ? 0 : -(i - 1) * til) + 'px; }\n';
                    }
                }
                document.getElementById('blockstyle').innerText = style;
                self.currentPage('play-game');
                
                setTimeout(function(){
                    var tileBuf = [];
                    for (var i = 1; i <= dif; i++){
                        for (var j = 1; j <= dif; j++){
                            if ((i != dif) || (j != dif)) tileBuf.push(j + 'x' + i);
                        }
                    }

                    shuffle(tileBuf);

                    var el = document.getElementById('puzzle');
                    el.innerHTML = '';
                    tileMap = [];
                    for (var i = 0; i < dif; i++){
                        tileMap[i] = [];
                        for (var j = 0; j < dif; j++){
                            if (tileBuf.length){
                                var t = tileBuf.pop();
                                tileMap[i][j] = t;
                                var d = document.createElement('DIV');
                                d.className = 'block border3d tile' + t;
                                d.style.left = (j * til) + 'px';
                                d.style.top = (i * til) + 'px';
                                el.appendChild(d);
                            }
                        }
                    }

                    var d = document.createElement('DIV');
                    d.className = 'image';
                    el.appendChild(d);

                    tileMap[dif - 1][dif - 1] = null;

                    if (timer) window.clearInterval(timer);
                    self.playerTime(0);
                    self.playerMoves(0);
                    timer = window.setInterval(function(){
                        if (!self.paused()){
                            self.playerTime(self.playerTime() + 1);
                        }
                    }, 1000);
                    
                    var hammer = new Hammer(document.getElementById('puzzle'), {
                        swipe_time: 1000,
                        swipe_min_distance: 1
                    });
                    hammer.onswipe = function(e){
                        if (self.winner()) return false;
                        
                        var x = -1;
                        var y = -1;
                        for (var i = 0; i < tileMap.length; i++){
                            for (var j = 0; j < tileMap[i].length; j++){
                                if (tileMap[i][j] === null){
                                    x = j;
                                    y = i;
                                    break;
                                }
                            }
                        }

                        var t = null;
                        var dir = e.direction;
                        var d = tileMap[y][x];
                        switch (dir){
                            case 'up':
                                t = (tileMap[y + 1] || empty)[x];
                                break;
                            case 'down':
                                t = (tileMap[y - 1] || empty)[x];
                                break;
                            case 'left':
                                t = (tileMap[y] || empty)[x + 1];

                                break;
                            case 'right':
                                t = (tileMap[y] || empty)[x - 1];
                                break;
                        }

                        if (t !== null && typeof t === 'string' && d === null){
                            var el = document.querySelector('#puzzle .block.tile' + t);
                            if (el){
                                el.style.left = (x * til) + 'px';
                                el.style.top = (y * til) + 'px';
                                self.playerMoves(self.playerMoves() + 1);
                                
                                switch (dir){
                                    case 'up':
                                        tileMap[y][x] = t;
                                        tileMap[y + 1][x] = null;
                                        break;
                                    case 'down':
                                        tileMap[y][x] = t;
                                        tileMap[y - 1][x] = null;
                                        break;
                                    case 'left':
                                        tileMap[y][x] = t;

                                        tileMap[y][x + 1] = null;
                                        break;
                                    case 'right':
                                        tileMap[y][x] = t;
                                        tileMap[y][x - 1] = null;
                                        break;
                                }
                            }
                        }

                        if (checkWin()){
                            self.winner(true);
                            setTimeout(function(){
                                if (timer) window.clearInterval(timer);
                                self.endGame();
                            }, 1000);
                        }

                        if (e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
                        if (e.originalEvent.cancelBubble != null) e.originalEvent.cancelBubble = true;
                        if (e.originalEvent.preventDefault) e.originalEvent.preventDefault();
                        return false;
                    };
                }, 0);
            };
            pre.src = src;
            self.mask(true);
        };
        
        self.endGame = function(){
            if (self.winner()){
                self.playerName('');
                self.currentPage('win-game');
            }else{
                self.paused(true);
                self.prompt({
                    title: 'End game',
                    message: 'Are you sure you want to end the current game?',
                    buttons: ['yes', 'no'],
                    yes: function(){
                        if (timer) window.clearInterval(timer);
                        
                        self.prompt(null);
                        self.winner(false);
                        self.paused(false);
                        self.playerDifficulty(null);
                        self.playerImage(null);
                        self.currentPage('main-menu');
                    },
                    no: function(){
                        self.prompt(null);
                        self.paused(false);
                    }
                });
            }
        };
        
        self.pauseGame = function(){
            self.paused(true);
        };
        
        self.resumeGame = function(){
            self.paused(false);
        };

        self.currentPage = ko.observable('main-menu');
        self.currentPage.subscribe(function(page){
            switch (page){
                case 'image-gallery':
                    if (self.galleryScroller){
                        self.galleryScroller.destroy();
                        self.galleryScroller = null;
                    }
                    self.images([]);
                    self.imagesCount(0);
                    self.loadImages(0);
                    break;
                case 'leaderboards':
                    if (self.tableScroller){
                        self.tableScroller.destroy();
                        self.tableScroller = null;
                    }
                    self.highscores([]);
                    self.highscoresCount(0);
                    self.loadHighscores(0);
                    break;
            }
            
            if (page != 'image-gallery'){
                if (self.galleryScroller){
                    self.galleryScroller.destroy();
                    self.galleryScroller = null;
                }
            }
        });
        
        self.loadImages = function(skip){
            self.mask(true);
            return $data.initService(apiKey).then(function(mydatabase, factory, type){
                self.serviceFactory(factory);
                self.error(false);

                if (!self.imagesCount()){
                    mydatabase.Images.length(self.imagesCount);
                }
                
                return mydatabase.Images.filter(function(it){
                    return !it.Banned;
                }).orderByDescending('it.LastModified').map(function(it){
                    return it.Id;
                }).skip(skip).take(5).toArray().then(function(images){
                    if (images.length){
                        if (self.images().length){
                            self.images(self.images().concat(images));
                        }else{
                            self.images(images);
                        }
                    }
                    self.mask(false);
                }).then(self.initScroller);
            }).fail(function(err){
                self.error(true);
                self.mask(false);
            });
        };
        
        self.loadHighscores = function(skip){
            self.mask(true);
            return $data.initService(apiKey).then(function(mydatabase, factory, type){
                self.serviceFactory(factory);
                self.error(false);
                
                return mydatabase.Highscores.length(self.highscoresCount).then(function(){
                    return mydatabase.Highscores
                        .orderBy('it.Moves')
                        .orderBy('it.Time')
                        .orderByDescending('it.Size')
                        .skip(skip)
                        .take(5)
                        .toArray()
                        .then(function(highscores){
                            if (highscores.length){
                                if (self.highscores().length){
                                    self.highscores(self.highscores().concat(highscores));
                                }else{
                                    self.highscores(highscores);
                                }
                            }
                            self.mask(false);
                        });
                }).then(self.initTableScroller);
            }).fail(function(err){
                self.error(true);
                self.mask(false);
            });
        };
        
        self.sendScore = function(){
            self.mask(true);
            return $data.initService(apiKey).then(function(mydatabase, factory, type){
                self.serviceFactory(factory);
                self.error(false);
                
                mydatabase.Highscores.add({
                    Name: self.playerName(),
                    Time: self.playerTime(),
                    Moves: self.playerMoves(),
                    Size: self.playerDifficulty()
                });
                
                return mydatabase.saveChanges().then(function(){
                    self.mask(false);
                    self.currentPage('leaderboards');
                });
            }).fail(function(err){
                self.error(true);
                self.mask(false);
            });
        };
        
        self.galleryScroller = null;
        self.initScroller = function(){
            setTimeout(function(){
                document.querySelector('#image-gallery .wrapper .scroller').style.width = (self.images().length * 220) + 'px';
                
                if (self.galleryScroller){
                    self.galleryScroller.refresh();
                }else{
                    if (!document.querySelector('.gallery-image-container.active')){
                        document.querySelector('.gallery-image-container:nth-child(1)').className = 'gallery-image-container active';
                    }
                    
                    self.galleryScroller = new iScroll(document.querySelector('#image-gallery .wrapper'), {
                        snap: true,
                        momentum: true,
                        hScrollbar: false,
                        onScrollEnd: function(){
                            if (document.querySelector('.gallery-image-container.active')){
                                document.querySelector('.gallery-image-container.active').className = 'gallery-image-container';
                            }
                            document.querySelector('.gallery-image-container:nth-child(' + (this.currPageX + 1) + ')').className = 'gallery-image-container active';
                            
                            if (this.currPageX == this.pagesX.length - 1 && this.pagesX.length < self.imagesCount()){
                                self.loadImages(this.currPageX + 1);
                            }
                        }
                    });
                }
            }, 0);
        };
        
        self.initTableScroller = function(data, event){
            setTimeout(function(){
                if (self.tableScroller){
                    self.tableScroller.refresh();
                }else{
                    pullUpEl = document.getElementById('pullUp');
                    pullUpOffset = pullUpEl.offsetHeight;
                    
                    self.tableScroller = new iScroll(document.querySelector('#leaderboards .wrapper'), {
                        useTransition: true,
                        onRefresh: function(){
                            if (pullUpEl.className.match('loading')) {
                                pullUpEl.className = 'message';
                                pullUpEl.innerHTML = 'Pull up to load more...';
                            }
                        },
                        onScrollMove: function(){
                            if (this.y < (this.maxScrollY - 5) && !pullUpEl.className.match('flip')){
                                pullUpEl.className = 'message flip';
                                pullUpEl.innerHTML = 'Release to refresh...';
                                this.maxScrollY = this.maxScrollY;
                            } else if (this.y > (this.maxScrollY + 5) && pullUpEl.className.match('flip')) {
                                pullUpEl.className = 'message';
                                pullUpEl.innerHTML = 'Pull up to load more...';
                                this.maxScrollY = pullUpOffset;
                            }
                        },
                        onScrollEnd: function(){
                            if (pullUpEl.className.match('message flip')) {
                                pullUpEl.className = 'message loading';
                                pullUpEl.innerHTML = 'Loading...';
                                self.loadHighscores(document.querySelector('#leaderboards .wrapper table tbody').children.length).then(function(){
                                    pullUpEl.className = 'message';
                                    pullUpEl.innerHTML = 'Pull up to load more...';
                                });
                            }
                        }
                    });
                }
            }, 0);
        }

        self.getImageURL = function(id, ctx){
            var f = ctx || self.serviceFactory()();
            if (f){
                return f.storageProvider.providerConfiguration.oDataServiceHost + '/getImage?id=\'' + id + '\'';
            }else{
                return '_blank';
            }
        };
        
        self.getThumbnailURL = function(id, ctx){
            var f = ctx || self.serviceFactory()();
            if (f){
                return f.storageProvider.providerConfiguration.oDataServiceHost + '/getThumbnail?id=\'' + id + '\'';
            }else{
                return '_blank';
            }
        };
        
        self.formatTime = function(time){
            return Math.floor(time / 60) + ':' + ('00' + (time - Math.floor(time / 60) * 60)).slice(-2);
        };

        self.playerName = ko.observable();
        self.playerTime = ko.observable(0);
        self.playerMoves = ko.observable(0);
        self.playerDifficulty = ko.observable();
        self.playerImage = ko.observable();
    };

    document.addEventListener('touchmove', function(e){ if (e.srcElement.tagName !== 'INPUT') e.preventDefault(); });
    document.addEventListener('touchstart', function(e){ if (e.srcElement.tagName !== 'INPUT') e.preventDefault(); });
    
    ko.applyBindings(new SlidingPuzzle(), document.body);
});
