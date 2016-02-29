/**
 * Created by lusilva on 2/21/16.
 */


import Logger from 'App/logger';
import htmlToText from 'html-to-text';
import getUrls from 'get-urls';

export default function getEventsForCity(city, eventCreatorCallback, opt_page) {
    const page_size = 50;
    const days = 30;
    const page = opt_page || 1;
    const MAX_PAGES_TO_FETCH = Meteor.settings.maxPagesPerCity || 50;

    Logger.debug('CITY: %s | PAGE: %d', city, page, {time: new Date()});

    let today = new Date();
    let endDate = new Date();
    endDate.setDate(today.getDate() + days);
    let date = formatEventfulDate(today) + "-" + formatEventfulDate(endDate);

    Meteor.http.get("http://api.eventful.com/json/events/search",
        {
            timeout: 30000,
            params: {
                app_key: Meteor.settings.eventfulAPIKey,
                page_size: page_size,
                date: date,
                where: city,
                within: '20',
                units: 'miles',
                sort_order: 'popularity',
                page_number: page,
                include: "price,categories",
                image_sizes: "medium,block,large,edpborder250,dropshadow250,dropshadow170,block178"
            }
        },
        function (error, result) {
            if (error || result.statusCode != 200) {
                Logger.error("could not fetch events from eventful for %s", city, error || JSON.parse(result.content));
                return;
            }
            let resultJSON = JSON.parse(result.content);

            let events = resultJSON.events.event;

            _.each(events, function (event, index) {
                // Popularity score is a simple measure the order of the results from 0 to 1. Since we
                // are sorting our query by popularity, more popular items should be higher on each page.
                event.popularity_score = 1 - ((page - 1) * page_size + index) / resultJSON.total_items;

                // Parse out all html tags from the description, and convert it to normal text.
                let description = htmlToText.fromString(
                    event.description,
                    {
                        ignoreHref: true,
                        ignoreImage: true,
                        preserveNewlines: true
                    }
                );
                description = !description || description == 'null' || description.length == 0 ?
                    "No Description Available" : description;


                // Extract any links from the description.
                event.links = event.description ? getUrls(event.description) : [];


                _.map(event.categories.category, function (category) {
                    category.name = htmlToText.fromString(category.name);
                    return category;
                });

                event.start_time = event.start_time ? new Date(event.start_time) : null;
                event.stop_time = event.stop_time ? new Date(event.stop_time) : null;


                event.description = description;
                eventCreatorCallback(event);
            });

            if (Math.min(resultJSON.page_count, MAX_PAGES_TO_FETCH) > page)
                getEventsForCity(city, eventCreatorCallback, page + 1)
        });
}

function formatEventfulDate(date) {
    var string = "";
    string += date.getFullYear();
    if (date.getMonth() < 9) {
        string += "0";
    }
    string += (date.getMonth() + 1);
    if (date.getDate() < 10) {
        string += "0";
    }
    string += date.getDate();
    string += "00";

    return string;
}