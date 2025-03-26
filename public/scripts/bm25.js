class BM25 {
    constructor(docs, k1 = 1.2, b = 0.75) {
        this.docs = docs;
        this.k1 = k1;
        this.b = b;
        this.N = docs.length;
        this.docLengths = docs.map(doc => doc.text.length);
        this.avgD = this.docLengths.reduce((sum, len) => sum + len, 0) / this.N;
        this.df = {};
        this.index = this.buildIndex();
    }

    buildIndex() {
        let index = {};
        this.docs.forEach((doc, i) => {
            let terms = doc.text.toLowerCase().split(/\s+/);
            let termFreqs = {};
            terms.forEach(term => {
                termFreqs[term] = (termFreqs[term] || 0) + 1;
            });
            index[doc.id] = termFreqs;
            for (let term in termFreqs) {
                this.df[term] = (this.df[term] || 0) + 1;
            }
        });
        return index;
    }

    idf(term) {
        if (!this.df[term]) return 0;
        return Math.log((this.N - this.df[term] + 0.5) / (this.df[term] + 0.5) + 1);
    }

    score(doc, query) {
        let fields = {
            title: 2.0,
            abstract: 1.5,
            keywords: 1.2,
            authors: 1.0
        };

        let score = 0;
        let queryTerms = query.toLowerCase().split(/\s+/);

        for (let field in fields) {
            let terms = (doc[field] || "").toLowerCase().split(/\s+/);
            let fieldLength = terms.length;
            let weight = fields[field];

            queryTerms.forEach(term => {
                let tf = terms.filter(t => t === term).length;
                let idf = this.idf(term);
                if (tf > 0) {
                    score += weight * idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * (fieldLength / this.avgD))));
                }
            });
        }

        return score;
    }

    rank(query) {
        return this.docs.map(doc => ({
            ...doc,
            score: this.score(doc, query)
        })).sort((a, b) => b.score - a.score);
    }
}

module.exports = { BM25 };