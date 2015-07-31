<ul>
    <% for(var i=0,l=models.length; i<l; i++) { %>
        <li class="results-item" data-id="<%= models[i].urlid %>">
            <a href="#model/<%= models[i].urlid %>">
                <img src="<%= models[i].thumbnailUrl %>" alt="" width="100" height="100">
            </a>
        </li>
    <% } %>
<ul>
