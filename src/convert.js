// CONVERTS POPULATION FILEs (popN) TO CSV DATA
const fs = require('fs');

// Main
(function() {

  var path = process.argv[2] + "/pop";
  var maxGen = parseInt(process.argv[3], 10);
  var csvStr = "generation,genome,run,score,lifetime,rank,fps,fitness,connections,input_nodes,hidden_nodes,output_nodes";

  for (var gen = 0; gen <= maxGen; gen++) {

    var popSave = JSON.parse(fs.readFileSync(path + gen, 'utf8'));

    for (var p in popSave.pop) {
      var g = popSave.pop[p];
      var head = "\n" + gen + "," + p;
      for (var r in g.scores) {
        csvStr += head + "," + r
          + "," + g.scores[r]
          + "," + g.lifetimes[r]
          + "," + g.ranks[r]
          + "," + g.fpss[r]
          + "," + g.score
          + "," + g.connections.length
          + "," + g.input
          + "," + (g.nodes.length - g.input - g.output)
          + "," + g.output;
      }
    }
  };
  fs.writeFileSync("out.csv", csvStr);

})();
