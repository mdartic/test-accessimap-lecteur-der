var Utils = require('./../../der.utils.js');
var JSZip = require('jszip');
// var DerExplore = require('./der.explore.js');

var React = require('react');

var DerContainer = React.createClass({
  getInitialState: function() {
    return {
      svg: ''
    }
  },

  componentWillMount: function() {
    this.setDerFile(this.props.derFile);
  },

  componentWillReceiveProps: function(nextProps) {
    if (this.props.derFile !== nextProps.derFile) {
      this.setDerFile(nextProps.derFile);
    }
    if (this.props.selectedDocument !== nextProps.selectedDocument) {
      this.changeDocument(nextProps.selectedDocument);
    }
  },

  setDerFile: function(derFile) {
    var _this = this;
    if (typeof derFile === 'string') {
      Utils.getFileObject(derFile, function (file) {
        _this.openDerFile(file);
      });
    } else {
      this.openDerFile(derFile);
    }
  },

  openDerFile: function(file) {
    var _this = this;

    if (file.type.split('.').pop() !== 'application/zip') {
      this.props.message('Fichier non valide, le fichier envoyé doit être au format ZIP', 'error');
    }
    var new_zip = new JSZip();
    new_zip.loadAsync(file)
    .then(function(zip) {
      _this._extractFiles(zip.files, function(error, der) {
        if (error === null) {
          _this.props.message('');
          _this.loadDer(der);
        } else {
          _this.props.message(error, 'error');
        }
      });
    });
  },


  /**
  * Read MP3 contained in ZIP file
  * @param name: {string} required
  */
  readAudioFile(name) {
    return new Promise(function(resolve, reject) {
      this.state.filesByExt.audioFiles[name].async('base64')
      .then(function(base64string) {
        var sound = new Audio('data:audio/wav;base64,' + base64string);
        sound.play();
        sound.onended = function() {
          resolve();
        };
      }, function() {
        reject();
      });
    });
  },


  /**
  * Extract files contained in ZIP file
  * @param files: {Object} required
  * @param listContainer: {HTMLElement} required
  * @param callback: {Function}
  */
  _extractFiles: function(files, callback) {
    this.setState({filesByExt: Utils.orderFilesByExt(files)});

    if (this.state.filesByExt.svg.length > 1) {
      this.props.setFilesList(this.state.filesByExt.svg);
    }
    this.readFiles(this.state.filesByExt.xml[0], this.state.filesByExt.svg[this.props.selectedDocument], callback);
  },

  readFiles: function(xml, svg, callback) {
    var getJson = new Promise(function(resolve, reject) {
      xml.async('string')
      .then(function(data) {
        var node = Utils.parseXml(data);
        var json = Utils.XML2jsobj(node.documentElement);
        resolve(json);
      }, function(error) {
        reject(error);
      });
    });

    var getSvg = new Promise(function(resolve, reject) {
      svg.async('string')
      .then(function(data) {
        resolve({svg: data});
      }, function(error) {
        reject(error);
      });
    });

    Promise.all([getJson, getSvg]).then(function(values) {
      var der = {};
      Object.assign(der, values[0], values[1]);
      if (callback) {
        callback(null, der);
      }
    }, function() {
      if (callback) {
        callback('Fichier non valide, aucun document en relief n\'a été trouvé dans le ZIP');
      }
    });
  },

  changeDocument: function(index) {
    var _this = this;
    this.readFiles(this.state.filesByExt.xml[0], this.state.filesByExt.svg[index], function(error, der) {
      _this.loadDer(der);
    });
  },


  /**
  * Once all files are ready, load DER on DOM
  * @param der: {Object} required
  * @param container: {HTMLElement} required
  * @param tts: {Function}
  */
  loadDer: function(der) {
    if (der.svg !== undefined) {
      this.refs.container.innerHTML = der.svg
    } else {
      this.props.message('Aucun SVG trouvé', 'error');
    }

    if (der.pois.poi !== undefined) {
      if (this.props.mode === 'explore') {
        this.attachPoiActions(der.pois.poi);
      } else {
        var poi = der.pois.poi[1]
        var id = poi.id.split('-').pop();
        var elementToFind = document.querySelectorAll('[data-link="' + id + '"]')[0];
        // DerSearch.setSearchEvents(elementToFind, DerFile.layout.derContainer, DerFile.tts);
      }
    } else {
      this.props.message('Aucun JSON trouvé', 'error');
    }
  },

  attachPoiActions: function(pois) {
    pois.map(function(poi) {
      var id = poi.id.split('-').pop();
      var poiEl = document.querySelectorAll('[data-link="' + id + '"]')[0];
      if (poiEl !== undefined) {
        // DerExplore.setExploreEvents(poiEl, poi.actions.action, DerFile.readAudioFile, DerFile.tts);
      }
    });
  },

  render: function() {

    return (
      <div className="der-container" ref="container">
      </div>
    );
  }
});

module.exports = DerContainer;
