import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Fonction qui gère le scraping d'UNE SEULE page avec une requête et une date
async function scrapeSinglePage(pageNumber, encodedQuery, dateFrom, dateTo) {
    // L'URL inclut désormais la requête (encodedQuery) et les paramètres de date
    const websiteUrl = `https://eur-lex.europa.eu/search.html?SUBDOM_INIT=ALL_ALL&DTS_SUBDOM=ALL_ALL&textScope1=ti-te&DTS_DOM=ALL&lang=en&type=advanced&wh0=andCOMPOSE%3DENG%2CorEMBEDDED_MANIFESTATION-TYPE%3Dpdf%3BEMBEDDED_MANIFESTATION-TYPE%3Dpdfa1a%3BEMBEDDED_MANIFESTATION-TYPE%3Dpdfa1b%3BEMBEDDED_MANIFESTATION-TYPE%3Dpdfa2a%3BEMBEDDED_MANIFESTATION-TYPE%3Dpdfx%3BEMBEDDED_MANIFESTATION-TYPE%3Dpdf1x%3BEMBEDDED_MANIFESTATION-TYPE%3Dhtml%3BEMBEDDED_MANIFESTATION-TYPE%3Dxhtml%3BEMBEDDED_MANIFESTATION-TYPE%3Ddoc%3BEMBEDDED_MANIFESTATION-TYPE%3Ddocx&andText1=${encodedQuery}&dtl_date_from=${dateFrom}&dtl_date_to=${dateTo}&page=${pageNumber}`;
    
    console.log(`Scraping page ${pageNumber}...`);

    const response = await axios.get(websiteUrl);
    const $ = cheerio.load(response.data);
    const results = [];

    console.log(results);


    $('.SearchResult').each((_index, element) => {
        const resultElement = $(element);
        const titleLinkElement = resultElement.find('h2 a');
        const title = titleLinkElement.text().trim() || 'No Title Found';
        const link = titleLinkElement.attr('href');
        console.log(link);
        const internalIdElement = resultElement.find('.internalNum');
        const internalId = internalIdElement.text().trim() || 'No Internal ID Found';

        if (title && link) {
            results.push({
                title: title,
                link: `https://eur-lex.europa.eu${link}`,
                internalId: internalId
            });
        }
    });

    return results;
}

// Nouvelle fonction de gestion de l'API pour lancer le scraping de toutes les pages
async function scrapeAllEurlex(req, res) {
    // Votre chaîne de recherche complexe
    const searchQuery = 'antidumping AND phosphate';
    const encodedQuery = encodeURIComponent(searchQuery);

    // DÉFINITION DE LA PÉRIODE DE RECHERCHE POUR L'ANNÉE 2025
    const dateFrom = '2025-01-01';
    const dateTo = '2025-12-31';

    const allResults = [];
    let page = 1;

    try {
        while (true) {
            // La fonction est appelée avec les paramètres de date en plus
            const pageResults = await scrapeSinglePage(page, encodedQuery, dateFrom, dateTo);
            
            if (pageResults.length === 0) {
                console.log(`No results found on page ${page}. Stopping pagination.`);
                break;
            }
            
            allResults.push(...pageResults);
            page++;
        }

        if (allResults.length === 0) {
            return res.json({
                message: 'Aucun résultat trouvé avec les critères spécifiés sur toutes les pages.',
                results: []
            });
        }

        return res.json({
            message: 'Scraping de toutes les pages réussi',
            totalResults: allResults.length,
            results: allResults
        });

    } catch (error) {
        console.error('Erreur lors du scraping:', error.message);
        return res.status(500).json({ message: 'Erreur lors de la récupération du site', error: error.message });
    }
}

app.get('/scrape-all-eurlex', scrapeAllEurlex);

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/demo', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/display-results', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});